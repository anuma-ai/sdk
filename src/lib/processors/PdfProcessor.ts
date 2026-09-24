import { getLogger } from "../logger";
import { convertPdfToImages, extractPdfPageTexts } from "../pdf";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

/**
 * Maximum number of PDF pages to convert to images per document.
 * Keeps payload size reasonable for the vision model.
 */
// TODO(ceiling): a fixed page count ignores image size/tokens; upgrade to a token-based image
// budget shared with the text budget (or page retrieval for long scans).
const MAX_IMAGE_PAGES = 20;

/**
 * A page whose text layer has fewer characters than this is treated as image-only (a scanned
 * page, a page number or running header over a scan) and rendered as an image.
 */
const MIN_PAGE_TEXT_CHARS = 20;

/**
 * Split a document's pages into those rendered as images and those that needed an image but
 * are over the per-document budget. `pageTexts[i]` is the text of page `i + 1`.
 */
export function selectPdfImagePages(
  pageTexts: string[],
  maxImagePages: number = MAX_IMAGE_PAGES
): { rendered: number[]; omitted: number[] } {
  const needImage: number[] = [];
  pageTexts.forEach((text, index) => {
    if (text.trim().length < MIN_PAGE_TEXT_CHARS) needImage.push(index + 1);
  });
  const limit = Math.max(0, maxImagePages);
  return { rendered: needImage.slice(0, limit), omitted: needImage.slice(limit) };
}

/** "page 3", "pages 2-4, 7" */
export function formatPageList(pages: number[]): string {
  const ranges: string[] = [];
  for (let i = 0; i < pages.length; i++) {
    const start = pages[i];
    let end = start;
    while (i + 1 < pages.length && pages[i + 1] === end + 1) end = pages[++i];
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
  }
  return `${pages.length === 1 ? "page" : "pages"} ${ranges.join(", ")}`;
}

/**
 * The sentence telling the model which pages of a PDF arrived as images and which did not.
 *
 * @param includedPages - pages whose images are actually in the message
 * @param omittedPages - pages that needed an image but are not in the message
 * @param pageCount - total pages, or undefined when unknown
 */
export function buildPdfImageNote(
  fileName: string,
  includedPages: number[],
  omittedPages: number[],
  pageCount: number | undefined
): string {
  const imageOnlyCount = includedPages.length + omittedPages.length;
  const allPages = [...includedPages, ...omittedPages].sort((a, b) => a - b);
  const subject =
    pageCount === undefined || imageOnlyCount >= pageCount
      ? `${fileName}: scanned/image-based PDF (no extractable text)`
      : `${fileName}: ${imageOnlyCount} of ${pageCount} pages have no extractable text (${formatPageList(allPages)})`;

  if (includedPages.length === 0) {
    return `[${subject} — ${formatPageList(omittedPages)} could not be included as images because of the image limit, so their content is not available]`;
  }
  const included = `${formatPageList(includedPages)} rendered as images and included in this message for visual analysis`;
  if (omittedPages.length === 0) return `[${subject} — ${included}]`;
  return `[${subject} — ${included}; ${formatPageList(omittedPages)} not included because of the image limit, so their content is not available]`;
}

/**
 * Rewrite a result's image note after a consumer kept only the first `keptImages` of its
 * `imageDataUrls` (the cross-file image budget, or 0 inside a zip archive), so the text never
 * claims an image the message does not carry. Returns the text unchanged when nothing was dropped
 * or the result has no image note.
 */
export function rewriteImageNote(
  result: ProcessedFileResult,
  fileName: string,
  keptImages: number
): string {
  const images = result.imageDataUrls ?? [];
  const note = result.metadata?.imageNote;
  if (!note || keptImages >= images.length) return result.extractedText;

  const imagePages = (result.metadata?.imagePages as number[] | undefined) ?? [];
  const omittedPages = (result.metadata?.omittedImagePages as number[] | undefined) ?? [];
  const pageCount = result.metadata?.pageCount;
  const kept = Math.max(0, keptImages);
  const newNote = buildPdfImageNote(
    fileName,
    imagePages.slice(0, kept),
    [...imagePages.slice(kept), ...omittedPages].sort((a, b) => a - b),
    pageCount
  );
  return result.extractedText.replace(note, newNote);
}

/**
 * Processor for PDF files that extracts text content page by page.
 *
 * Pages without a usable text layer (scanned pages, including scans inside an otherwise-digital
 * document) are rendered as images, up to {@link MAX_IMAGE_PAGES}, so a vision model can read
 * them. A note at the top of the text states exactly which pages arrived as images and which
 * were left out.
 */
export class PdfProcessor implements FileProcessor {
  readonly name = "pdf";
  readonly supportedMimeTypes = ["application/pdf"];
  readonly supportedExtensions = [".pdf"];

  async process(file: FileWithData): Promise<ProcessedFileResult | null> {
    const logger = getLogger();

    // --- Text per page first (fast, small payload) ---
    let pageTexts: string[] | null = null;
    try {
      pageTexts = await extractPdfPageTexts(file.dataUrl);
    } catch (textError) {
      logger.warn(
        "[PdfProcessor] Text extraction failed — falling back to image conversion:",
        textError
      );
    }

    const text = (pageTexts ?? []).filter((t) => t.trim()).join("\n\n");
    // Unknown page layout (text extraction threw): render the first pages, as before.
    const { rendered, omitted } = pageTexts
      ? selectPdfImagePages(pageTexts)
      : { rendered: [] as number[], omitted: [] as number[] };

    if (pageTexts && rendered.length === 0 && omitted.length === 0) {
      return text.trim() ? { extractedText: text, format: "plain" } : null;
    }

    // --- Render the image-only pages for vision models ---
    let images: string[];
    try {
      images = pageTexts
        ? rendered.length > 0
          ? await convertPdfToImages(file.dataUrl, undefined, rendered)
          : []
        : await convertPdfToImages(file.dataUrl, MAX_IMAGE_PAGES);
    } catch (imageError) {
      if (!text.trim()) {
        logger.error("[PdfProcessor] Image conversion also failed:", imageError);
        throw imageError;
      }
      logger.warn("[PdfProcessor] Image conversion failed — keeping text only:", imageError);
      images = [];
    }

    const imagePages = pageTexts ? rendered.slice(0, images.length) : images.map((_, i) => i + 1);
    const omittedPages = pageTexts
      ? [...rendered.slice(images.length), ...omitted].sort((a, b) => a - b)
      : [];

    if (images.length === 0 && !text.trim()) {
      logger.warn("[PdfProcessor] Image conversion also returned empty");
      return null;
    }

    logger.info(
      `[PdfProcessor] Rendered ${images.length} page(s) as images, ${omittedPages.length} image-only page(s) omitted`
    );

    // Contextual note for the LLM — keep it self-contained since the images are only injected
    // in the current request and not persisted for follow-up turns. It goes FIRST so a text
    // cap never cuts it off.
    const imageNote = buildPdfImageNote(file.name, imagePages, omittedPages, pageTexts?.length);
    return {
      extractedText: text.trim() ? `${imageNote}\n\n${text}` : imageNote,
      format: "plain",
      imageDataUrls: images.length > 0 ? images : undefined,
      metadata: {
        pageCount: pageTexts?.length,
        imageNote,
        imagePages,
        omittedImagePages: omittedPages,
        truncated: omittedPages.length > 0,
      },
    };
  }
}
