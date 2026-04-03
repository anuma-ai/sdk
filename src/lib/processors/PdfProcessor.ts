import { getLogger } from "../logger";
import { convertPdfToImages, extractTextFromPdf } from "../pdf";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

/**
 * Maximum number of PDF pages to convert to images when falling back.
 * Keeps payload size reasonable for the vision model.
 */
const MAX_IMAGE_PAGES = 20;

/**
 * Processor for PDF files that extracts text content.
 * Falls back to rendering pages as images when text extraction yields no
 * content (e.g. scanned/image-based PDFs), enabling vision models to read
 * the document.
 */
export class PdfProcessor implements FileProcessor {
  readonly name = "pdf";
  readonly supportedMimeTypes = ["application/pdf"];
  readonly supportedExtensions = [".pdf"];

  async process(file: FileWithData): Promise<ProcessedFileResult | null> {
    const logger = getLogger();

    // --- Try text extraction first (fast, small payload) ---
    try {
      const text = await extractTextFromPdf(file.dataUrl);

      if (text && text.trim().length > 0) {
        return {
          extractedText: text,
          format: "plain",
        };
      }

      logger.info(
        `[PdfProcessor] Text extraction returned empty for "${file.name}" — falling back to image conversion`
      );
    } catch (textError) {
      logger.warn(
        `[PdfProcessor] Text extraction failed for "${file.name}" — falling back to image conversion:`,
        textError
      );
    }

    // --- Fallback: convert pages to images for vision models ---
    try {
      const images = await convertPdfToImages(file.dataUrl, MAX_IMAGE_PAGES);

      if (images.length === 0) {
        logger.warn(`[PdfProcessor] Image conversion also returned empty for "${file.name}"`);
        return null;
      }

      logger.info(`[PdfProcessor] Converted ${images.length} page(s) of "${file.name}" to images`);

      return {
        // Short text summary so the caller knows what happened
        extractedText: `[${file.name}: ${images.length} page(s) rendered as images — see attached images below]`,
        format: "plain",
        imageDataUrls: images,
        metadata: { pageCount: images.length },
      };
    } catch (imageError) {
      logger.error(`[PdfProcessor] Image conversion also failed for "${file.name}":`, imageError);
      throw imageError;
    }
  }
}
