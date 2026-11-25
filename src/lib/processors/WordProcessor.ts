import type mammoth from "mammoth";

import { getLogger } from "../logger";
import { dataUrlToArrayBuffer } from "./encoding";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

/**
 * Processor for Word documents (.docx) that converts to markdown
 */
export class WordProcessor implements FileProcessor {
  readonly name = "word";
  readonly supportedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  readonly supportedExtensions = [".docx"];

  async process(file: FileWithData): Promise<ProcessedFileResult | null> {
    try {
      const arrayBuffer = await dataUrlToArrayBuffer(file.dataUrl);

      const isNode =
        typeof process !== "undefined" &&
        process.versions !== null &&
        process.versions !== undefined &&
        process.versions.node !== null &&
        process.versions.node !== undefined;
      const input = isNode ? { buffer: Buffer.from(arrayBuffer) } : { arrayBuffer };
      const mammothLib = await this.loadMammoth();
      const result = await mammothLib.extractRawText(input);

      if (!result.value || result.value.trim().length === 0) {
        return null;
      }

      return {
        extractedText: result.value,
        format: "plain",
        metadata: {
          wordCount: this.countWords(result.value),
          messages: result.messages.length > 0 ? result.messages : undefined,
        },
      };
    } catch (error) {
      getLogger().error("Error processing Word document:", error);
      throw error;
    }
  }

  private async loadMammoth(): Promise<typeof mammoth> {
    const mod = await import("mammoth");
    return mod.default ?? mod;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter((w) => w.length > 0).length;
  }
}
