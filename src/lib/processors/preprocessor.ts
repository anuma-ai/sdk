import type { FileMetadata } from "../db/chat/types";
import { getLogger } from "../logger";
import { ExcelProcessor } from "./ExcelProcessor";
import { PdfProcessor } from "./PdfProcessor";
import { type FileTypeQuery, ProcessorRegistry } from "./registry";
import { TextProcessor } from "./TextProcessor";
import type { FileWithData, PreprocessingOptions, PreprocessingResult } from "./types";
import { WordProcessor } from "./WordProcessor";
import { ZipProcessor } from "./ZipProcessor";

/** Maximum total image fallback URLs across all files in a single preprocessing run */
const MAX_TOTAL_IMAGES = 20;

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
    maxFileSizeBytes = 10 * 1024 * 1024, // 10MB
    timeoutMs = 30_000, // 30s per file
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
      metadata: { processedCount: 0, skippedCount: 0, errorCount: 0 },
    };
  }

  if (processors !== undefined && processors !== null && processors.length === 0) {
    // Explicit opt-out with empty array
    return {
      extractedContent: null,
      originalFiles: files,
      preprocessedFileIds: [],
      metadata: { processedCount: 0, skippedCount: 0, errorCount: 0 },
    };
  }

  if (processors === null) {
    // Explicit opt-out with null
    return {
      extractedContent: null,
      originalFiles: files,
      preprocessedFileIds: [],
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
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    onProgress?.(i + 1, files.length, file.name);

    // Skip files that are too large
    if (file.size > maxFileSizeBytes) {
      logger.info(
        `[preprocessFiles] Skipping "${file.name}" — exceeds ${maxFileSizeBytes} byte limit`
      );
      skippedCount++;
      continue;
    }

    // Find appropriate processor
    const processor = registry.findProcessor(file);
    if (!processor) {
      skippedCount++;
      continue;
    }

    try {
      // Ensure file has a data URL
      if (!file.url) {
        logger.info(`[preprocessFiles] Skipping "${file.name}" — no data URL available`);
        skippedCount++;
        continue;
      }

      // Process file
      const fileWithData: FileWithData = {
        ...file,
        dataUrl: file.url,
      };

      const result = await Promise.race([
        processor.process(fileWithData),
        new Promise<null>((_, reject) =>
          setTimeout(() => reject(new Error(`Timed out processing ${file.name}`)), timeoutMs)
        ),
      ]);

      if (result && result.extractedText.trim()) {
        // Format the extracted content
        const formattedContent = formatExtractedContent(
          file.name,
          result.extractedText,
          result.format
        );
        extractedTexts.push(formattedContent);
        preprocessedFileIds.push(file.id); // Track which files were preprocessed
        processedCount++;

        // Collect image fallback URLs (e.g. scanned PDF pages rendered as images).
        // Cap at 20 images total across all files to keep payload size reasonable.
        if (result.imageDataUrls && result.imageDataUrls.length > 0) {
          const remaining = MAX_TOTAL_IMAGES - allImageUrls.length;
          if (remaining > 0) {
            allImageUrls.push(...result.imageDataUrls.slice(0, remaining));
          }
        }
      } else {
        skippedCount++;
      }
    } catch (error) {
      errorCount++;
      logger.error(`[preprocessFiles] Error processing "${file.name}":`, error);
      onError?.(file.name, error instanceof Error ? error : new Error(String(error)));
    }
  }

  const extractedContent = extractedTexts.length > 0 ? extractedTexts.join("\n\n---\n\n") : null;

  return {
    extractedContent,
    imageContentUrls: allImageUrls.length > 0 ? allImageUrls : undefined,
    originalFiles: keepOriginalFiles ? files : undefined,
    preprocessedFileIds,
    metadata: { processedCount, skippedCount, errorCount },
  };
}
