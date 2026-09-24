import JSZip from "jszip";

import type { FileMetadata } from "../db/chat/types";
import { getLogger } from "../logger";
import { dataUrlToArrayBuffer, uint8ArrayToBase64 } from "./encoding";
import { rewriteImageNote } from "./PdfProcessor";
import { ProcessorRegistry } from "./registry";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

// TODO(ceiling): fixed entry/byte counts bound work, not what reaches the model; upgrade to a
// token-based budget (or retrieval over the archive) if large archives become common.
/** Maximum archive entries listed and considered for extraction. */
const MAX_ZIP_ENTRIES = 1_000;
/** Maximum total decompressed bytes read out of one archive. */
const MAX_TOTAL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

/**
 * Size the archive's central directory declares for an entry, read BEFORE inflating it. JSZip
 * keeps it on the private `_data` field; undefined when unavailable (then the post-inflate
 * check still applies).
 */
function declaredUncompressedSize(zipObject: JSZip.JSZipObject): number | undefined {
  const size = (zipObject as unknown as { _data?: { uncompressedSize?: unknown } })._data
    ?.uncompressedSize;
  return typeof size === "number" ? size : undefined;
}

/**
 * Options for configuring ZipProcessor behavior
 */
export interface ZipProcessorOptions {
  /** Maximum size (in bytes) for processing individual files (default: 10MB) */
  maxFileSize?: number;

  /** Whether to include hidden files and directories (default: false) */
  includeHidden?: boolean;
}

/**
 * Processor for ZIP archive files that extracts contents and delegates
 * to other processors for supported file types
 */
export class ZipProcessor implements FileProcessor {
  readonly name = "zip";
  readonly supportedMimeTypes = [
    "application/zip",
    "application/x-zip-compressed",
    "application/x-zip",
  ];
  readonly supportedExtensions = [".zip"];

  /** Maximum size (in bytes) for processing individual files */
  private readonly maxFileSize: number;

  /** Whether to include hidden files and directories */
  private readonly includeHidden: boolean;

  /** Registry of processors for nested files */
  private registry: ProcessorRegistry | null = null;

  constructor(options: ZipProcessorOptions = {}) {
    this.maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024; // 10MB default
    this.includeHidden = options.includeHidden ?? false;
  }

  /**
   * Set the processor registry for handling nested files
   * This must be called before processing if you want nested file support
   */
  setRegistry(registry: ProcessorRegistry): void {
    this.registry = registry;
  }

  async process(file: FileWithData): Promise<ProcessedFileResult | null> {
    try {
      const arrayBuffer = await dataUrlToArrayBuffer(file.dataUrl);
      const zip = await JSZip.loadAsync(arrayBuffer);

      const entries: ZipEntry[] = [];
      const processedContents: ProcessedContent[] = [];

      // Collect all entries
      zip.forEach((relativePath, zipEntry) => {
        entries.push({
          path: relativePath,
          isDirectory: zipEntry.dir,
          zipObject: zipEntry,
        });
      });

      // Filter out hidden files/directories if includeHidden is false
      const visibleEntries = this.includeHidden
        ? entries
        : entries.filter((entry) => !this.isHidden(entry.path));

      // Sort entries: directories first, then files, alphabetically
      visibleEntries.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.path.localeCompare(b.path);
      });

      const filteredEntries = visibleEntries.slice(0, MAX_ZIP_ENTRIES);
      const notes: string[] = [];
      if (visibleEntries.length > filteredEntries.length) {
        notes.push(
          `[truncated: showing the first ${filteredEntries.length} of ${visibleEntries.length} archive entries]`
        );
      }

      let totalBytes = 0;
      let byteBudgetHit = false;
      let truncated = notes.length > 0;
      const logger = getLogger();

      // Process files that have matching processors
      for (let index = 0; index < filteredEntries.length; index++) {
        const entry = filteredEntries[index];
        if (entry.isDirectory) continue;

        // Build file metadata for registry lookup
        const fileName = entry.path.split("/").pop() || entry.path;
        const extension = this.getFileExtension(fileName);
        const mimeType = this.guessMimeType(extension);

        const fileMetadata: FileMetadata = {
          id: `zip-entry-${entry.path}`,
          name: fileName,
          type: mimeType,
          size: 0, // Will be determined when reading
        };

        // Find a processor for this file (excluding zip to prevent recursion)
        const processor = this.registry?.findProcessor(fileMetadata);
        if (!processor || processor.name === "zip") continue;

        // Check the declared size before inflating, so one oversized (or zip-bomb) entry is
        // never decompressed into memory.
        const declared = declaredUncompressedSize(entry.zipObject);
        if (declared !== undefined && declared > this.maxFileSize) continue;
        if (totalBytes + (declared ?? 0) > MAX_TOTAL_UNCOMPRESSED_BYTES) {
          byteBudgetHit = true;
          break;
        }

        try {
          // Read file content
          const data = await entry.zipObject.async("uint8array");
          totalBytes += data.length;

          // Skip files that are too large
          if (data.length > this.maxFileSize) continue;
          if (totalBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
            byteBudgetHit = true;
            break;
          }

          // Convert to data URL
          const base64 = uint8ArrayToBase64(data);
          const dataUrl = `data:${mimeType};base64,${base64}`;

          const fileWithData: FileWithData = {
            ...fileMetadata,
            size: data.length,
            dataUrl,
          };

          // Process with the found processor
          const result = await processor.process(fileWithData);

          if (result && result.extractedText.trim()) {
            if (result.metadata?.truncated || result.imageDataUrls?.length) truncated = true;
            processedContents.push({
              path: entry.path,
              processorName: processor.name,
              // Page images of nested files are not forwarded, so their note must not claim them.
              result: { ...result, extractedText: rewriteImageNote(result, fileName, 0) },
            });
          }
        } catch (error) {
          // Expected for corrupted or unsupported files within archives — keep going, but leave
          // a trace. No entry path: it can carry user content.
          logger.warn(
            `[ZipProcessor] Failed to process archive entry #${index + 1} (${processor.name}, ${mimeType})`,
            error
          );
        }
      }

      if (byteBudgetHit) {
        truncated = true;
        notes.push(
          `[truncated: stopped reading the archive after ${Math.round(MAX_TOTAL_UNCOMPRESSED_BYTES / 1024 / 1024)} MB of decompressed content; later files were not extracted]`
        );
      }

      // Build output
      const output = [this.formatOutput(filteredEntries, processedContents), ...notes].join("\n");

      return {
        extractedText: output,
        format: "markdown",
        metadata: {
          fileCount: filteredEntries.filter((e) => !e.isDirectory).length,
          directoryCount: filteredEntries.filter((e) => e.isDirectory).length,
          processedFiles: processedContents.length,
          truncated,
        },
      };
    } catch (error) {
      getLogger().error("Error processing ZIP file:", error);
      throw error;
    }
  }

  /**
   * Check if a path represents a hidden file or directory
   */
  private isHidden(path: string): boolean {
    // Split path into segments
    const segments = path.split("/").filter((s) => s.length > 0);

    // Check each segment for hidden indicators
    for (const segment of segments) {
      // Hidden if starts with dot (Unix convention)
      if (segment.startsWith(".")) return true;

      // Hidden if is __MACOSX or other double-underscore system folders
      if (segment.startsWith("__")) return true;
    }

    return false;
  }

  /**
   * Format the output with file listing and processed contents
   */
  private formatOutput(entries: ZipEntry[], processedContents: ProcessedContent[]): string {
    const lines: string[] = [];

    // File listing section
    lines.push("## Archive Contents\n");
    lines.push("```");
    for (const entry of entries) {
      const icon = entry.isDirectory ? "📁" : "📄";
      lines.push(`${icon} ${entry.path}`);
    }
    lines.push("```\n");

    // Summary
    const fileCount = entries.filter((e) => !e.isDirectory).length;
    const dirCount = entries.filter((e) => e.isDirectory).length;
    lines.push(
      `**Summary:** ${fileCount} file${fileCount !== 1 ? "s" : ""}, ${dirCount} director${dirCount !== 1 ? "ies" : "y"}\n`
    );

    // Processed file contents
    if (processedContents.length > 0) {
      lines.push("## Extracted Content\n");
      for (const pc of processedContents) {
        lines.push(`### ${pc.path}\n`);

        // Format based on the result format
        if (pc.result.format === "json") {
          lines.push("```json");
          lines.push(pc.result.extractedText);
          lines.push("```\n");
        } else if (pc.result.format === "markdown") {
          lines.push(pc.result.extractedText);
          lines.push("");
        } else {
          lines.push(pc.result.extractedText);
          lines.push("");
        }
      }
    }

    return lines.join("\n");
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : "";
  }

  /**
   * Guess MIME type from file extension
   */
  private guessMimeType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".doc": "application/msword",
      ".txt": "text/plain",
      ".json": "application/json",
      ".xml": "application/xml",
      ".html": "text/html",
      ".htm": "text/html",
      ".csv": "text/csv",
      ".zip": "application/zip",
    };
    return mimeTypes[extension] || "application/octet-stream";
  }
}

interface ZipEntry {
  path: string;
  isDirectory: boolean;
  zipObject: JSZip.JSZipObject;
}

interface ProcessedContent {
  path: string;
  processorName: string;
  result: ProcessedFileResult;
}
