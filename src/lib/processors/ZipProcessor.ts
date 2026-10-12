import JSZip from "jszip";

import type { FileMetadata } from "../db/chat/types";
import { getLogger } from "../logger";
import { dataUrlToArrayBuffer, uint8ArrayToBase64 } from "./encoding";
import { rewriteImageNote } from "./PdfProcessor";
import { ProcessorRegistry } from "./registry";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

const MAX_ZIP_ENTRIES = 1_000;
const MAX_TOTAL_UNCOMPRESSED_BYTES = 50 * 1024 * 1024;

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
    this.maxFileSize = options.maxFileSize ?? 10 * 1024 * 1024;
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

      zip.forEach((relativePath, zipEntry) => {
        entries.push({
          path: relativePath,
          isDirectory: zipEntry.dir,
          zipObject: zipEntry,
        });
      });

      const visibleEntries = this.includeHidden
        ? entries
        : entries.filter((entry) => !this.isHidden(entry.path));

      visibleEntries.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) {
          return a.isDirectory ? -1 : 1;
        }
        return a.path.localeCompare(b.path);
      });

      const visibleDirs = visibleEntries.filter((e) => e.isDirectory);
      const visibleFiles = visibleEntries.filter((e) => !e.isDirectory);
      const listedDirs = visibleDirs.slice(0, MAX_ZIP_ENTRIES);
      const listedFiles = visibleFiles.slice(0, MAX_ZIP_ENTRIES);
      const filteredEntries = [...listedDirs, ...listedFiles];
      const notes: string[] = [];
      if (visibleFiles.length > listedFiles.length) {
        notes.push(
          `[truncated: the archive has ${visibleFiles.length} files; only the first ${listedFiles.length} were listed and considered for extraction, the other ${visibleFiles.length - listedFiles.length} files were dropped]`
        );
      }
      if (visibleDirs.length > listedDirs.length) {
        notes.push(
          `[truncated: listing the first ${listedDirs.length} of ${visibleDirs.length} directories]`
        );
      }

      let totalBytes = 0;
      let byteBudgetHit = false;
      let truncated = notes.length > 0;
      const logger = getLogger();

      for (let index = 0; index < filteredEntries.length; index++) {
        const entry = filteredEntries[index];
        if (entry.isDirectory) continue;

        const fileName = entry.path.split("/").pop() || entry.path;
        const extension = this.getFileExtension(fileName);
        const mimeType = this.guessMimeType(extension);

        const fileMetadata: FileMetadata = {
          id: `zip-entry-${entry.path}`,
          name: fileName,
          type: mimeType,
          size: 0,
        };

        const processor = this.registry?.findProcessor(fileMetadata);
        if (!processor || processor.name === "zip") continue;

        const declared = declaredUncompressedSize(entry.zipObject);
        if (declared !== undefined && declared > this.maxFileSize) continue;
        if (totalBytes + (declared ?? 0) > MAX_TOTAL_UNCOMPRESSED_BYTES) {
          byteBudgetHit = true;
          break;
        }

        try {
          const data = await entry.zipObject.async("uint8array");
          totalBytes += data.length;

          if (data.length > this.maxFileSize) continue;
          if (totalBytes > MAX_TOTAL_UNCOMPRESSED_BYTES) {
            byteBudgetHit = true;
            break;
          }

          const base64 = uint8ArrayToBase64(data);
          const dataUrl = `data:${mimeType};base64,${base64}`;

          const fileWithData: FileWithData = {
            ...fileMetadata,
            size: data.length,
            dataUrl,
          };

          const result = await processor.process(fileWithData);

          if (result && result.extractedText.trim()) {
            if (result.metadata?.truncated || result.imageDataUrls?.length) truncated = true;
            processedContents.push({
              path: entry.path,
              processorName: processor.name,
              result: { ...result, extractedText: rewriteImageNote(result, fileName, 0) },
            });
          }
        } catch (error) {
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
    const segments = path.split("/").filter((s) => s.length > 0);

    for (const segment of segments) {
      if (segment.startsWith(".")) return true;

      if (segment.startsWith("__")) return true;
    }

    return false;
  }

  /**
   * Format the output with file listing and processed contents
   */
  private formatOutput(entries: ZipEntry[], processedContents: ProcessedContent[]): string {
    const lines: string[] = [];

    lines.push("## Archive Contents\n");
    lines.push("```");
    for (const entry of entries) {
      const icon = entry.isDirectory ? "📁" : "📄";
      lines.push(`${icon} ${entry.path}`);
    }
    lines.push("```\n");

    const fileCount = entries.filter((e) => !e.isDirectory).length;
    const dirCount = entries.filter((e) => e.isDirectory).length;
    lines.push(
      `**Summary:** ${fileCount} file${fileCount !== 1 ? "s" : ""}, ${dirCount} director${dirCount !== 1 ? "ies" : "y"}\n`
    );

    if (processedContents.length > 0) {
      lines.push("## Extracted Content\n");
      for (const pc of processedContents) {
        lines.push(`### ${pc.path}\n`);

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
