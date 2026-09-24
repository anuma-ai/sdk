import type { PDFDocumentProxy } from "pdfjs-dist";

let pdfjsModule: typeof import("pdfjs-dist") | null = null;
let workerConfigured = false;

/** Preferred render scale for page images (pdf.js default viewport is 72 DPI). */
const RENDER_SCALE = 1.5;
/** Longest side, in pixels, of a rendered page image — bounds payload for oversized pages. */
const MAX_RENDER_SIDE_PX = 1600;
/** JPEG quality for rendered page images (PNG was several times larger for scans). */
const JPEG_QUALITY = 0.8;

async function getPdfjs() {
  if (!pdfjsModule) {
    pdfjsModule = await import("pdfjs-dist");

    // Configure worker - use CDN in browser, skip in Node.js (uses main-thread fallback)
    if (!workerConfigured && typeof window !== "undefined") {
      pdfjsModule.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsModule.version}/build/pdf.worker.min.mjs`;
      workerConfigured = true;
    }
  }
  return pdfjsModule;
}

/**
 * Open a PDF, run `fn`, and always release pdf.js resources (worker-side document, page caches)
 * — on success, on failure inside `fn`, and when the document fails to load.
 */
async function withPdfDocument<T>(
  pdfDataUrl: string,
  fn: (pdf: PDFDocumentProxy) => Promise<T>
): Promise<T> {
  const pdfjs = await getPdfjs();
  const loadingTask = pdfjs.getDocument(pdfDataUrl);
  let pdf: PDFDocumentProxy;
  try {
    pdf = await loadingTask.promise;
  } catch (error) {
    await loadingTask.destroy().catch(() => undefined);
    throw error;
  }
  try {
    return await fn(pdf);
  } finally {
    await pdf.destroy().catch(() => undefined);
  }
}

/**
 * Join pdf.js text items into a page's text, keeping the line breaks pdf.js reports via
 * `hasEOL` (joining everything with spaces collapsed tables and lists into one line).
 */
export function joinPdfTextItems(items: ReadonlyArray<object>): string {
  let text = "";
  for (const item of items) {
    if (!("str" in item)) continue;
    const { str, hasEOL } = item as { str: string; hasEOL?: boolean };
    text += str + (hasEOL ? "\n" : " ");
  }
  return text.replace(/[ \t]+\n/g, "\n").trim();
}

/**
 * Scale at which to render a page whose scale-1 viewport is `width` x `height`: the preferred
 * scale, reduced so the longest side stays within the pixel cap.
 */
export function computeRenderScale(width: number, height: number): number {
  const longest = Math.max(width, height);
  if (!(longest > 0)) return RENDER_SCALE;
  return Math.min(RENDER_SCALE, MAX_RENDER_SIDE_PX / longest);
}

/**
 * Extract the text of every page, in page order (index 0 = page 1). Pages with no text layer
 * yield an empty string.
 */
export async function extractPdfPageTexts(pdfDataUrl: string): Promise<string[]> {
  return withPdfDocument(pdfDataUrl, async (pdf) => {
    const pageTexts: string[] = [];
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      pageTexts.push(joinPdfTextItems(textContent.items));
    }
    return pageTexts;
  });
}

export async function extractTextFromPdf(pdfDataUrl: string): Promise<string> {
  const pageTexts = await extractPdfPageTexts(pdfDataUrl);
  return pageTexts.filter((text) => text.trim()).join("\n\n");
}

/** One rendered page: its 1-based number and its JPEG data URL. */
export interface RenderedPdfPage {
  pageNumber: number;
  dataUrl: string;
}

/**
 * Render PDF pages to JPEG, reporting which page each image came from — a page whose canvas
 * cannot be created is skipped, so the images are not always the pages that were asked for.
 *
 * @param maxPages - Render at most the first `maxPages` pages (ignored when `pageNumbers` is set)
 * @param pageNumbers - 1-based pages to render, in order; out-of-range pages are skipped
 * @returns the rendered pages, in order, and the document's total page count
 */
export async function renderPdfPages(
  pdfDataUrl: string,
  maxPages?: number,
  pageNumbers?: number[]
): Promise<{ pages: RenderedPdfPage[]; pageCount: number }> {
  return withPdfDocument(pdfDataUrl, async (pdf) => {
    const requested =
      pageNumbers?.filter((n) => n >= 1 && n <= pdf.numPages) ??
      Array.from(
        { length: maxPages !== undefined ? Math.min(maxPages, pdf.numPages) : pdf.numPages },
        (_, i) => i + 1
      );

    const pages: RenderedPdfPage[] = [];
    for (const pageNumber of requested) {
      const page = await pdf.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: computeRenderScale(base.width, base.height) });

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) continue;

      canvas.height = Math.floor(viewport.height);
      canvas.width = Math.floor(viewport.width);

      // JPEG has no alpha: any pixel left transparent encodes as black. Paint the page white
      // ourselves rather than relying on pdf.js's default fill.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);

      await page.render({
        canvasContext: context,
        viewport: viewport,
        background: "#ffffff",
      }).promise;

      pages.push({ pageNumber, dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY) });
      // Release the backing store now rather than whenever GC gets to it — a 20-page scan
      // otherwise holds 20 full-size bitmaps (Safari caps total canvas memory).
      canvas.width = 0;
      canvas.height = 0;
    }
    return { pages, pageCount: pdf.numPages };
  });
}

/**
 * Render PDF pages to JPEG data URLs. See {@link renderPdfPages} to learn which page each image
 * is (a page that cannot be rendered is skipped).
 *
 * @param maxPages - Render at most the first `maxPages` pages (ignored when `pageNumbers` is set)
 * @param pageNumbers - 1-based pages to render, in order; out-of-range pages are skipped
 */
export async function convertPdfToImages(
  pdfDataUrl: string,
  maxPages?: number,
  pageNumbers?: number[]
): Promise<string[]> {
  const { pages } = await renderPdfPages(pdfDataUrl, maxPages, pageNumbers);
  return pages.map((p) => p.dataUrl);
}
