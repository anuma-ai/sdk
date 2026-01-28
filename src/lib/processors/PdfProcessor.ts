import { extractTextFromPdf } from "../pdf";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

/**
 * Processor for PDF files that extracts text content
 */
export class PdfProcessor implements FileProcessor {
  readonly name = "pdf";
  readonly supportedMimeTypes = ["application/pdf"];
  readonly supportedExtensions = [".pdf"];

  async process(file: FileWithData): Promise<ProcessedFileResult | null> {
    try {
      const text = await extractTextFromPdf(file.dataUrl);

      if (!text || text.trim().length === 0) {
        return null;
      }

      return {
        extractedText: text,
        format: "plain",
        metadata: {
          // Could add page count if we modify extractTextFromPdf to return it
        },
      };
    } catch (error) {
      console.error("Error processing PDF:", error);
      throw error;
    }
  }
}
