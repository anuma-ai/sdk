import type { FileMetadata } from "../db/chat/types";
import type { FileProcessor } from "./types";

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
  findProcessor(file: FileMetadata): FileProcessor | null {
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
