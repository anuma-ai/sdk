import type { FileMetadata } from "../db/chat/types";
import { getLogger } from "../logger";
import { ExcelProcessor } from "./ExcelProcessor";
import { DEFAULT_MAX_FILE_SIZE_BYTES } from "./fileStatusNotes";
import { PdfProcessor, rewriteImageNote } from "./PdfProcessor";
import { type FileTypeQuery, ProcessorRegistry } from "./registry";
import { TextProcessor } from "./TextProcessor";
import type {
  FileProcessingReason,
  FileProcessingStatus,
  FileWithData,
  PreprocessingOptions,
  PreprocessingResult,
} from "./types";
import { WordProcessor } from "./WordProcessor";
import { ZipProcessor } from "./ZipProcessor";

/** Maximum total image fallback URLs across all files in a single preprocessing run */
// TODO(ceiling): counts images, not their tokens; upgrade to a token-based budget shared with text.
const MAX_TOTAL_IMAGES = 20;

// TODO(ceiling): character caps are a proxy for the model's context window; upgrade to
// token-based budgets sized to the selected model, or to retrieval over the document so long
// files are searched instead of cut.
/** Default max characters of extracted text kept per file. */
const DEFAULT_MAX_EXTRACTED_CHARS_PER_FILE = 100_000;
/** Default max characters of extracted text kept across all files of one run. */
const DEFAULT_MAX_EXTRACTED_CHARS_TOTAL = 200_000;

/** Error raised when a processor exceeds `timeoutMs`. */
class ProcessingTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Timed out processing file after ${timeoutMs}ms`);
    this.name = "ProcessingTimeoutError";
  }
}

/**
 * Keep at most `limit` characters of `text`, ending with a marker that names how much was kept.
 * Never splits a surrogate pair.
 */
function truncateText(
  text: string,
  limit: number,
  fileName: string
): { text: string; truncated: boolean } {
  if (text.length <= limit) return { text, truncated: false };
  let end = Math.max(0, limit);
  const code = text.charCodeAt(end - 1);
  if (end > 0 && code >= 0xd800 && code <= 0xdbff) end--;
  return {
    text: `${text.slice(0, end)}\n[truncated: showing the first ${end} of ${text.length} characters of ${fileName}]`,
    truncated: true,
  };
}

function isImageFile(file: FileMetadata): boolean {
  return (file.type ?? "").trim().toLowerCase().startsWith("image/");
}

/**
 * Build a registry containing all built-in processors.
 *
 * Single source of truth used both by `preprocessFiles` (when no custom
 * processor list is supplied) and by the public `isSupportedFile` /
 * `getSupportedFileTypes` helpers — keeping upload-time validation and
 * runtime processing in lockstep so an attached file that passes validation
 * is guaranteed to have a processor.
 */
function createDefaultRegistry(): ProcessorRegistry {
  const registry = new ProcessorRegistry();
  registry.register(new PdfProcessor());
  registry.register(new ExcelProcessor());
  registry.register(new WordProcessor());
  registry.register(new TextProcessor());

  // ZipProcessor needs registry to delegate to other processors
  const zipProcessor = new ZipProcessor();
  zipProcessor.setRegistry(registry);
  registry.register(zipProcessor);

  return registry;
}

/**
 * Lazily built and cached registry used by the validation helpers below.
 * Avoids paying processor-construction cost (e.g. ExcelProcessor's
 * process.umask polyfill check) until the first lookup, and avoids rebuilding
 * on every call to `isSupportedFile` (which can fire many times per drag-drop).
 */
let cachedDefaultRegistry: ProcessorRegistry | null = null;

function getDefaultRegistry(): ProcessorRegistry {
  if (!cachedDefaultRegistry) {
    cachedDefaultRegistry = createDefaultRegistry();
  }
  return cachedDefaultRegistry;
}

/**
 * Test whether the SDK can extract text from the given file.
 *
 * Use this for upload-time validation in drag-drop handlers, file-picker
 * onChange, or paste handlers — block at the boundary with a clear message
 * instead of silently accepting a file the model will never see.
 *
 * Note: this covers files handled by the SDK's text extractors (PDF, Word,
 * Excel, Zip, plain text/markdown/JSON, etc.). Image files (`image/*`) are
 * sent directly as `image_url` content parts and are NOT handled by
 * processors — combine with an image check in your validation:
 *
 * ```ts
 * const ok = file.type.startsWith("image/") || isSupportedFile(file);
 * ```
 */
export function isSupportedFile(file: FileTypeQuery): boolean {
  return getDefaultRegistry().isSupported(file);
}

/**
 * Get the union of all MIME types and extensions handled by the SDK's
 * default processors. Useful for building an `<input type="file" accept>`
 * allowlist.
 *
 * Note: does NOT include image MIME types — add `"image/*"` yourself if you
 * want the file picker to also accept images. See `isSupportedFile` docs.
 */
export function getSupportedFileTypes(): {
  mimeTypes: string[];
  extensions: string[];
} {
  const registry = getDefaultRegistry();
  return {
    mimeTypes: registry.getSupportedMimeTypes(),
    extensions: registry.getSupportedExtensions(),
  };
}

/**
 * Format extracted content with file context header
 */
function formatExtractedContent(
  fileName: string,
  content: string,
  format: "plain" | "markdown" | "json"
): string {
  const header = `[Extracted content from ${fileName}]`;

  if (format === "json") {
    return `${header}\n\`\`\`json\n${content}\n\`\`\``;
  } else if (format === "markdown") {
    return `${header}\n\n${content}`;
  } else {
    return `${header}\n${content}`;
  }
}

/**
 * Preprocess files by extracting text content
 *
 * @param files - Files to process
 * @param options - Preprocessing options
 * @returns Result with extracted content and metadata
 */
export async function preprocessFiles(
  files: FileMetadata[] | undefined,
  options: PreprocessingOptions = {}
): Promise<PreprocessingResult> {
  const {
    processors = undefined, // undefined means use defaults
    keepOriginalFiles = true,
    maxFileSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES,
    timeoutMs = 30_000, // 30s per file
    maxExtractedCharsPerFile = DEFAULT_MAX_EXTRACTED_CHARS_PER_FILE,
    maxExtractedCharsTotal = DEFAULT_MAX_EXTRACTED_CHARS_TOTAL,
    onProgress,
    onError,
  } = options;

  const logger = getLogger();

  // Handle opt-out cases
  if (!files || files.length === 0) {
    return {
      extractedContent: null,
      originalFiles: files,
      preprocessedFileIds: [],
      fileStatuses: [],
      metadata: { processedCount: 0, skippedCount: 0, errorCount: 0 },
    };
  }

  if (processors !== undefined && processors !== null && processors.length === 0) {
    // Explicit opt-out with empty array
    return {
      extractedContent: null,
      originalFiles: files,
      preprocessedFileIds: [],
      fileStatuses: [],
      metadata: { processedCount: 0, skippedCount: 0, errorCount: 0 },
    };
  }

  if (processors === null) {
    // Explicit opt-out with null
    return {
      extractedContent: null,
      originalFiles: files,
      preprocessedFileIds: [],
      fileStatuses: [],
      metadata: { processedCount: 0, skippedCount: 0, errorCount: 0 },
    };
  }

  // Build registry. Use the cached default when no overrides are provided so
  // a single registry instance is shared with the validation helpers.
  let registry: ProcessorRegistry;
  if (processors === undefined) {
    registry = getDefaultRegistry();
  } else {
    registry = new ProcessorRegistry();
    // Use provided processors, inject registry into ZipProcessor if present
    processors.forEach((p) => {
      if (p instanceof ZipProcessor) {
        p.setRegistry(registry);
      }
      registry.register(p);
    });
  }

  const extractedTexts: string[] = [];
  const allImageUrls: string[] = [];
  const preprocessedFileIds: string[] = [];
  const fileStatuses: FileProcessingStatus[] = [];
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let totalChars = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    // Log by position/type/size only — file names can carry user content, and clients forward
    // these logs off-device.
    const label = `#${i + 1} (${file.type || "unknown type"}, ${file.size} bytes)`;
    const skip = (reason: FileProcessingReason) => {
      skippedCount++;
      fileStatuses.push({ fileId: file.id, fileName: file.name, status: "skipped", reason });
    };

    onProgress?.(i + 1, files.length, file.name);

    // Find appropriate processor. Images without one are sent to the model as image_url parts
    // by the caller — they are neither skipped nor too large here.
    const processor = registry.findProcessor(file);
    if (!processor && isImageFile(file)) continue;

    // Skip files that are too large
    if (file.size > maxFileSizeBytes) {
      logger.info(
        `[preprocessFiles] Skipping file ${label} — exceeds ${maxFileSizeBytes} byte limit`
      );
      skip("too_large");
      continue;
    }

    if (!processor) {
      skip("unsupported_type");
      continue;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // Ensure file has a data URL
      if (!file.url) {
        logger.info(`[preprocessFiles] Skipping file ${label} — no data URL available`);
        skip("no_data");
        continue;
      }

      // Process file
      const fileWithData: FileWithData = {
        ...file,
        dataUrl: file.url,
      };

      const result = await Promise.race([
        processor.process(fileWithData),
        new Promise<null>((_, reject) => {
          timer = setTimeout(() => reject(new ProcessingTimeoutError(timeoutMs)), timeoutMs);
        }),
      ]);

      if (result && result.extractedText.trim()) {
        // Collect image fallback URLs (e.g. scanned PDF pages rendered as images), capped
        // across all files; when the cap drops some, rewrite the note that announced them.
        const images = result.imageDataUrls ?? [];
        const keptImages = Math.min(
          images.length,
          Math.max(0, MAX_TOTAL_IMAGES - allImageUrls.length)
        );
        allImageUrls.push(...images.slice(0, keptImages));
        const text = rewriteImageNote(result, file.name, keptImages);

        const limit = Math.max(
          0,
          Math.min(maxExtractedCharsPerFile, maxExtractedCharsTotal - totalChars)
        );
        const capped = truncateText(text, limit, file.name);
        totalChars += Math.min(text.length, limit);

        // Format the extracted content
        const formattedContent = formatExtractedContent(file.name, capped.text, result.format);
        extractedTexts.push(formattedContent);
        preprocessedFileIds.push(file.id); // Track which files were preprocessed
        processedCount++;

        // Any lost content wins over "rendered_as_images" — the app should say "partially read".
        const truncated =
          capped.truncated || keptImages < images.length || result.metadata?.truncated === true;
        fileStatuses.push({
          fileId: file.id,
          fileName: file.name,
          status: truncated ? "truncated" : keptImages > 0 ? "rendered_as_images" : "extracted",
        });
      } else {
        skip("empty");
      }
    } catch (error) {
      errorCount++;
      const timedOut = error instanceof ProcessingTimeoutError;
      fileStatuses.push({
        fileId: file.id,
        fileName: file.name,
        status: "failed",
        reason: timedOut ? "timeout" : "error",
      });
      logger.error(
        `[preprocessFiles] Error processing file ${label} with ${processor.name}:`,
        error
      );
      onError?.(file.name, error instanceof Error ? error : new Error(String(error)));
    } finally {
      clearTimeout(timer);
    }
  }

  const extractedContent = extractedTexts.length > 0 ? extractedTexts.join("\n\n---\n\n") : null;

  return {
    extractedContent,
    imageContentUrls: allImageUrls.length > 0 ? allImageUrls : undefined,
    originalFiles: keepOriginalFiles ? files : undefined,
    preprocessedFileIds,
    fileStatuses,
    metadata: { processedCount, skippedCount, errorCount },
  };
}
