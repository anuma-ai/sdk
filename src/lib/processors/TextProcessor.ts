import { getLogger } from "../logger";
import { dataUrlToArrayBuffer } from "./encoding";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

/**
 * Processor for plain-text files (.md, .txt, .csv, .json, .yaml, etc.) that
 * decodes the file's data URL as UTF-8 and inlines the contents into the user
 * message.
 *
 * Unlike PDF/Word/Excel, no transformation is needed — the raw text IS the
 * extractable content. Without this processor, text files attached in the UI
 * would be visible as attachments but their contents would never reach the
 * model (only `image/*` files are inlined directly by callers).
 */
export class TextProcessor implements FileProcessor {
  readonly name = "text";
  readonly supportedMimeTypes = [
    "text/plain",
    "text/markdown",
    "text/x-markdown",
    "text/csv",
    "text/tab-separated-values",
    "text/html",
    "text/xml",
    "text/yaml",
    "text/x-yaml",
    "application/json",
    "application/ld+json",
    "application/xml",
    "application/yaml",
    "application/x-yaml",
  ];
  readonly supportedExtensions = [
    ".txt",
    ".md",
    ".markdown",
    ".csv",
    ".tsv",
    ".json",
    ".jsonl",
    ".ndjson",
    ".log",
    ".yaml",
    ".yml",
    ".xml",
    ".html",
    ".htm",
    ".ini",
    ".toml",
    ".cfg",
    ".conf",
  ];

  async process(file: FileWithData): Promise<ProcessedFileResult | null> {
    try {
      const arrayBuffer = await dataUrlToArrayBuffer(file.dataUrl);

      // Use non-fatal decoding so a binary file accidentally labeled as text
      // (or one with a stray invalid byte) yields replacement chars instead
      // of throwing and losing the entire payload.
      const text = new TextDecoder("utf-8", { fatal: false }).decode(arrayBuffer);

      if (!text.trim()) {
        return null;
      }

      return {
        extractedText: text,
        format: this.resolveFormat(file),
        metadata: {
          byteLength: arrayBuffer.byteLength,
          characterCount: text.length,
        },
      };
    } catch (error) {
      getLogger().error("Error processing text file:", error);
      throw error;
    }
  }

  /**
   * Pick a format hint so the orchestrator can wrap the content appropriately
   * (e.g. JSON files get fenced as ```json so the model parses them as data
   * rather than prose).
   */
  private resolveFormat(file: FileWithData): "plain" | "markdown" | "json" {
    const type = file.type?.toLowerCase() ?? "";
    const name = file.name?.toLowerCase() ?? "";

    if (
      type === "text/markdown" ||
      type === "text/x-markdown" ||
      name.endsWith(".md") ||
      name.endsWith(".markdown")
    ) {
      return "markdown";
    }

    if (
      type === "application/json" ||
      type === "application/ld+json" ||
      name.endsWith(".json") ||
      name.endsWith(".jsonl") ||
      name.endsWith(".ndjson")
    ) {
      return "json";
    }

    return "plain";
  }
}
