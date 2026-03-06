import mammoth from "mammoth";

import { dataUrlToArrayBuffer } from "./encoding";
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
      const arrayBuffer = await dataUrlToArrayBuffer(file.dataUrl);

      // mammoth's Node.js build expects { buffer: Buffer }, while the browser
      // build accepts { arrayBuffer }. Detect true Node.js (not just polyfilled
      // Buffer) to pick the right input format.
      const isNode =
        typeof process !== "undefined" && process.versions != null && process.versions.node != null;
      const input = isNode ? { buffer: Buffer.from(arrayBuffer) } : { arrayBuffer };
      const result = await mammoth.extractRawText(input);

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
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }
}
