import type { FileMetadata } from "../db/chat/types";

/**
 * Extended file metadata with data URL for processing
 */
export interface FileWithData extends FileMetadata {
  /** Data URL or blob URL containing file content */
  dataUrl: string;
}

/**
 * Result from processing a file
 */
export interface ProcessedFileResult {
  /** Extracted text content */
  extractedText: string;

  /** Format hint for how text should be presented */
  format: "plain" | "markdown" | "json";

  /** Optional metadata about the extraction */
  metadata?: {
    pageCount?: number;
    sheetCount?: number;
    sheetNames?: string[];
    wordCount?: number;
    [key: string]: unknown;
  };
}

/**
 * Interface that all file processors must implement
 */
export interface FileProcessor {
  /** Unique identifier for this processor */
  readonly name: string;

  /** MIME types this processor can handle */
  readonly supportedMimeTypes: string[];

  /** File extensions this processor can handle (fallback if MIME type unavailable) */
  readonly supportedExtensions: string[];

  /**
   * Process a file and extract text content
   * @param file - File metadata with data URL
   * @returns Extracted text content and metadata, or null if processing fails/not applicable
   */
  process(file: FileWithData): Promise<ProcessedFileResult | null>;
}

/**
 * Options for file preprocessing
 */
export interface PreprocessingOptions {
  /**
   * Processors to use.
   * - undefined (default): Use all built-in processors
   * - null or []: Disable preprocessing
   * - FileProcessor[]: Use specific processors
   */
  processors?: FileProcessor[] | null;

  /** Whether to keep original file attachments (default: true) */
  keepOriginalFiles?: boolean;

  /** Max file size to process in bytes (default: 10MB) */
  maxFileSizeBytes?: number;

  /** Timeout per file in milliseconds (default: 30000). Prevents hangs from slow CDN workers or large files. */
  timeoutMs?: number;

  /** Callback for progress updates */
  onProgress?: (current: number, total: number, fileName: string) => void;

  /** Callback for errors (non-fatal) */
  onError?: (fileName: string, error: Error) => void;
}

/**
 * Result from preprocessing files
 */
export interface PreprocessingResult {
  /** Extracted content to prepend to user message */
  extractedContent: string | null;

  /** Original files (if keepOriginalFiles = true) */
  originalFiles?: FileMetadata[];

  /** IDs of files that were successfully preprocessed (used to remove from message) */
  preprocessedFileIds: string[];

  /** Processing metadata */
  metadata: {
    processedCount: number;
    skippedCount: number;
    errorCount: number;
  };
}
