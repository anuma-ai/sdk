import { getLogger } from "../logger";
import { dataUrlToArrayBuffer } from "./encoding";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

const MIME = {
  PLAIN: "text/plain",
  MARKDOWN: "text/markdown",
  X_MARKDOWN: "text/x-markdown",
  CSV: "text/csv",
  TSV: "text/tab-separated-values",
  HTML: "text/html",
  XML_TEXT: "text/xml",
  YAML_TEXT: "text/yaml",
  X_YAML_TEXT: "text/x-yaml",
  JSON: "application/json",
  LD_JSON: "application/ld+json",
  XML_APP: "application/xml",
  YAML_APP: "application/yaml",
  X_YAML_APP: "application/x-yaml",
} as const;

const EXT = {
  TXT: ".txt",
  MD: ".md",
  MARKDOWN: ".markdown",
  CSV: ".csv",
  TSV: ".tsv",
  JSON: ".json",
  JSONL: ".jsonl",
  NDJSON: ".ndjson",
  LOG: ".log",
  YAML: ".yaml",
  YML: ".yml",
  XML: ".xml",
  HTML: ".html",
  HTM: ".htm",
  INI: ".ini",
  TOML: ".toml",
  CFG: ".cfg",
  CONF: ".conf",
} as const;

/**
 * Decode text bytes, honoring a UTF-16 LE/BE byte-order mark (Windows "Unicode" exports — Excel
 * CSV, Notepad) and stripping a UTF-8 one. Without a BOM the bytes are read as UTF-8.
 *
 * Decoding is non-fatal so a binary file accidentally labeled as text (or one with a stray
 * invalid byte) yields replacement chars instead of throwing and losing the entire payload.
 */
function decodeText(bytes: Uint8Array): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le", { fatal: false }).decode(bytes.subarray(2));
  }
  if (bytes[0] === 0xfe && bytes[1] === 0xff) {
    // Swap to little-endian rather than asking for "utf-16be", which small-ICU runtimes lack.
    const swapped = new Uint8Array(bytes.length - 2);
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      swapped[i - 2] = bytes[i + 1];
      swapped[i - 1] = bytes[i];
    }
    return new TextDecoder("utf-16le", { fatal: false }).decode(swapped);
  }
  const hasUtf8Bom = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf;
  return new TextDecoder("utf-8", { fatal: false }).decode(hasUtf8Bom ? bytes.subarray(3) : bytes);
}

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
  readonly supportedMimeTypes = Object.values(MIME);
  readonly supportedExtensions = Object.values(EXT);

  async process(file: FileWithData): Promise<ProcessedFileResult | null> {
    try {
      const arrayBuffer = await dataUrlToArrayBuffer(file.dataUrl);

      const text = decodeText(new Uint8Array(arrayBuffer));

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
    const type = file.type?.split(";")[0].trim().toLowerCase() ?? "";
    const name = file.name?.toLowerCase() ?? "";

    if (
      type === MIME.MARKDOWN ||
      type === MIME.X_MARKDOWN ||
      name.endsWith(EXT.MD) ||
      name.endsWith(EXT.MARKDOWN)
    ) {
      return "markdown";
    }

    if (
      type === MIME.JSON ||
      type === MIME.LD_JSON ||
      name.endsWith(EXT.JSON) ||
      name.endsWith(EXT.JSONL) ||
      name.endsWith(EXT.NDJSON)
    ) {
      return "json";
    }

    return "plain";
  }
}
