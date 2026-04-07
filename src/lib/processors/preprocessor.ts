import type { FileMetadata } from "../db/chat/types";
import { getLogger } from "../logger";
import { ExcelProcessor } from "./ExcelProcessor";
import { PdfProcessor } from "./PdfProcessor";
import { ProcessorRegistry } from "./registry";
import type { FileWithData, PreprocessingOptions, PreprocessingResult } from "./types";
import { WordProcessor } from "./WordProcessor";
import { ZipProcessor } from "./ZipProcessor";

/** Maximum total image fallback URLs across all files in a single preprocessing run */
const MAX_TOTAL_IMAGES = 20;

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

  // Build registry
  const registry = new ProcessorRegistry();
  if (processors === undefined) {
    // Use defaults
    registry.register(new PdfProcessor());
    registry.register(new ExcelProcessor());
    registry.register(new WordProcessor());

    // ZipProcessor needs registry to delegate to other processors
    const zipProcessor = new ZipProcessor();
    zipProcessor.setRegistry(registry);
    registry.register(zipProcessor);
  } else {
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
