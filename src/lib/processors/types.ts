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

  /**
   * Fallback image data URLs (base64 PNG) when text extraction yields no content.
   * For example, scanned PDFs have no extractable text — rendering each page as an
   * image lets the vision model read the document instead.
   */
  imageDataUrls?: string[];

  /** Optional metadata about the extraction */
  metadata?: {
    /**
     * True when the processor itself dropped part of the file (e.g. spreadsheet rows past the
     * per-sheet cap). Surfaces as a `"truncated"` {@link FileProcessingStatus}.
     */
    truncated?: boolean;
    /**
     * The exact sentence in `extractedText` that describes `imageDataUrls` (e.g. "pages 2-3
     * rendered as images and included in this message"). A consumer that drops some or all of
     * those images (the cross-file image budget, a zip archive) replaces this sentence so the
     * model is never told an image was included when it was not.
     */
    imageNote?: string;
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

  /**
   * Max characters of extracted text kept per file (default: 100,000). Longer text is cut and
   * ends with a `[truncated: …]` marker naming how much was kept.
   */
  maxExtractedCharsPerFile?: number;

  /**
   * Max characters of extracted text kept across all files of one preprocessing run
   * (default: 200,000). Files past the budget are cut (or reduced to the marker) in order.
   */
  maxExtractedCharsTotal?: number;

  /** Callback for progress updates */
  onProgress?: (current: number, total: number, fileName: string) => void;

  /** Callback for errors (non-fatal) */
  onError?: (fileName: string, error: Error) => void;
}

/**
 * Why a file was not (fully) read. Paired with {@link FileProcessingStatus}.
 *
 * - `too_large`: over `maxFileSizeBytes`
 * - `unsupported_type`: no processor handles the file's type
 * - `no_data`: the file has no URL/data to read
 * - `empty`: the file was read but contained no extractable content
 * - `timeout`: processing exceeded `timeoutMs`
 * - `error`: the processor threw (corrupt, password-protected, …)
 */
export type FileProcessingReason =
  | "too_large"
  | "unsupported_type"
  | "no_data"
  | "empty"
  | "timeout"
  | "error";

/**
 * What happened to one attached file during preprocessing — so the app can tell the user
 * precisely which attachment the model could not read, and why.
 *
 * - `extracted`: its full text reached the model
 * - `truncated`: part of it reached the model (a size/row/image budget cut the rest)
 * - `rendered_as_images`: some or all pages were sent as images (scanned PDF)
 * - `skipped`: not processed (see `reason`)
 * - `failed`: processing was attempted and failed (see `reason`)
 */
export interface FileProcessingStatus {
  fileId: string;
  fileName: string;
  status: "extracted" | "truncated" | "rendered_as_images" | "skipped" | "failed";
  reason?: FileProcessingReason;
}

/**
 * Result from preprocessing files
 */
export interface PreprocessingResult {
  /** Extracted content to prepend to user message */
  extractedContent: string | null;

  /**
   * Image data URLs for files where text extraction failed but page images were
   * rendered (e.g. scanned PDFs). The caller should inject these as `image_url`
   * content parts in the user message so the vision model can read the document.
   */
  imageContentUrls?: string[];

  /** Original files (if keepOriginalFiles = true) */
  originalFiles?: FileMetadata[];

  /** IDs of files that were successfully preprocessed (used to remove from message) */
  preprocessedFileIds: string[];

  /**
   * One entry per input file, in input order. Image files (`image/*`) with no processor are
   * left out: callers send those directly as `image_url` parts, so they are not "skipped".
   */
  fileStatuses: FileProcessingStatus[];

  /** Processing metadata */
  metadata: {
    processedCount: number;
    skippedCount: number;
    errorCount: number;
  };
}
