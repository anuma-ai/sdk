import type { FileMetadata } from "../db/chat/types";
import { ExcelProcessor } from "./ExcelProcessor";
import { PdfProcessor } from "./PdfProcessor";
import { ProcessorRegistry } from "./registry";
import type {
  FileWithData,
  PreprocessingOptions,
  PreprocessingResult,
} from "./types";
import { WordProcessor } from "./WordProcessor";

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
    onProgress,
    onError,
  } = options;

  // Handle opt-out cases
  if (!files || files.length === 0) {
    return {
      extractedContent: null,
      originalFiles: files,
      metadata: { processedCount: 0, skippedCount: 0, errorCount: 0 },
    };
  }

  if (processors !== undefined && processors !== null && processors.length === 0) {
    // Explicit opt-out with empty array
    return {
      extractedContent: null,
      originalFiles: files,
      metadata: { processedCount: 0, skippedCount: 0, errorCount: 0 },
    };
  }

  if (processors === null) {
    // Explicit opt-out with null
    return {
      extractedContent: null,
      originalFiles: files,
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
  } else {
    // Use provided processors
    processors.forEach((p) => registry.register(p));
  }

  const extractedTexts: string[] = [];
  let processedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    onProgress?.(i + 1, files.length, file.name);

    // Skip files that are too large
    if (file.size > maxFileSizeBytes) {
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
        skippedCount++;
        continue;
      }

      // Process file
      const fileWithData: FileWithData = {
        ...file,
        dataUrl: file.url,
      };

      const result = await processor.process(fileWithData);

      if (result && result.extractedText.trim()) {
        // Format the extracted content
        const formattedContent = formatExtractedContent(
          file.name,
          result.extractedText,
          result.format
        );
        extractedTexts.push(formattedContent);
        processedCount++;
      } else {
        skippedCount++;
      }
    } catch (error) {
      errorCount++;
      onError?.(
        file.name,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  const extractedContent =
    extractedTexts.length > 0 ? extractedTexts.join("\n\n---\n\n") : null;

  return {
    extractedContent,
    originalFiles: keepOriginalFiles ? files : undefined,
    metadata: { processedCount, skippedCount, errorCount },
  };
}
