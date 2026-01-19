// Processors
export { PdfProcessor } from "./PdfProcessor";
export { ExcelProcessor } from "./ExcelProcessor";
export { WordProcessor } from "./WordProcessor";
export { ZipProcessor } from "./ZipProcessor";
export type { ZipProcessorOptions } from "./ZipProcessor";

// Registry
export { ProcessorRegistry } from "./registry";

// Orchestration
export { preprocessFiles } from "./preprocessor";

// Types
export type {
  FileProcessor,
  FileWithData,
  ProcessedFileResult,
  PreprocessingOptions,
  PreprocessingResult,
} from "./types";
