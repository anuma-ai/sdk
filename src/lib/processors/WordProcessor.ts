import mammoth from "mammoth";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

/**
 * Processor for Word documents (.docx) that converts to markdown
 */
export class WordProcessor implements FileProcessor {
  readonly name = "word";
  readonly supportedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  ];
  readonly supportedExtensions = [".docx"];

  async process(file: FileWithData): Promise<ProcessedFileResult | null> {
    try {
      const arrayBuffer = await this.dataUrlToArrayBuffer(file.dataUrl);

      // Extract raw text from Word document
      const result = await mammoth.extractRawText({ arrayBuffer });

      if (!result.value || result.value.trim().length === 0) {
        return null;
      }

      return {
        extractedText: result.value,
        format: "plain",
        metadata: {
          wordCount: this.countWords(result.value),
          // Include any conversion warnings
          messages: result.messages.length > 0 ? result.messages : undefined,
        },
      };
    } catch (error) {
      console.error("Error processing Word document:", error);
      throw error;
    }
  }

  /**
   * Convert data URL to ArrayBuffer
   */
  private async dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
    // Handle blob URLs and HTTPS URLs via fetch
    if (dataUrl.startsWith("blob:") || dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) {
      const response = await fetch(dataUrl);
      return response.arrayBuffer();
    }

    // Data URL format: data:[<mediatype>][;base64],<data>
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    return buffer;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }
}
