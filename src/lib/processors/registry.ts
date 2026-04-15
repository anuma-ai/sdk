import type { FileProcessor } from "./types";

/**
 * Minimal file shape needed to look up or test for a processor.
 * Wider than `FileMetadata` so callers with `File`, `Blob`-like objects, or
 * just a `{ name, type }` pair from a drag-drop event can use the API.
 */
export interface FileTypeQuery {
  name: string;
  type: string;
}

/**
 * Registry for managing and finding file processors
 */
export class ProcessorRegistry {
  private processors: Map<string, FileProcessor> = new Map();

  /**
   * Register a processor
   */
  register(processor: FileProcessor): void {
    this.processors.set(processor.name, processor);
  }

  /**
   * Find a processor that can handle the given file
   * @param file - File metadata to match
   * @returns The matching processor, or null if none found
   */
  findProcessor(file: FileTypeQuery): FileProcessor | null {
    // Try MIME type match first
    if (file.type) {
      for (const processor of this.processors.values()) {
        if (processor.supportedMimeTypes.includes(file.type)) {
          return processor;
        }
      }
    }

    // Fallback to extension match
    const extension = this.getFileExtension(file.name);
    if (extension) {
      for (const processor of this.processors.values()) {
        if (processor.supportedExtensions.includes(extension)) {
          return processor;
        }
      }
    }

    return null;
  }

  /**
   * Test whether any registered processor can handle the given file.
   * Convenience wrapper around `findProcessor` for upload-time validation
   * where you only care about the boolean answer.
   */
  isSupported(file: FileTypeQuery): boolean {
    return this.findProcessor(file) !== null;
  }

  /**
   * Get the union of all MIME types handled by registered processors.
   * Useful for building an `<input type="file" accept="...">` allowlist.
   * Result is deduplicated and sorted for stable output.
   */
  getSupportedMimeTypes(): string[] {
    const types = new Set<string>();
    for (const processor of this.processors.values()) {
      for (const mimeType of processor.supportedMimeTypes) {
        types.add(mimeType);
      }
    }
    return Array.from(types).sort();
  }

  /**
   * Get the union of all file extensions handled by registered processors.
   * Includes the leading dot (e.g. `.md`, `.pdf`) so values can be passed
   * directly to an `<input accept>` attribute.
   * Result is deduplicated and sorted for stable output.
   */
  getSupportedExtensions(): string[] {
    const extensions = new Set<string>();
    for (const processor of this.processors.values()) {
      for (const extension of processor.supportedExtensions) {
        extensions.add(extension);
      }
    }
    return Array.from(extensions).sort();
  }

  /**
   * Get all registered processors
   */
  getAll(): FileProcessor[] {
    return Array.from(this.processors.values());
  }

  /**
   * Extract file extension from filename
   */
  private getFileExtension(filename: string): string | null {
    const match = filename.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : null;
  }
}
