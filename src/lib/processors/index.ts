// Processors
export { ExcelProcessor } from "./ExcelProcessor";
export { PdfProcessor } from "./PdfProcessor";
export { WordProcessor } from "./WordProcessor";
export type { ZipProcessorOptions } from "./ZipProcessor";
export { ZipProcessor } from "./ZipProcessor";

// Registry
export { ProcessorRegistry } from "./registry";

// Orchestration
export { preprocessFiles } from "./preprocessor";

// Encoding utilities (universal browser + Node.js)
export { dataUrlToArrayBuffer, uint8ArrayToBase64 } from "./encoding";

// Types
export type {
  FileProcessor,
  FileWithData,
  PreprocessingOptions,
  PreprocessingResult,
  ProcessedFileResult,
} from "./types";
