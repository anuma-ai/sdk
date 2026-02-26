import * as XLSX from "xlsx";

import { getLogger } from "../logger";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

/**
 * Processor for Excel files (.xlsx, .xls) that converts to JSON structure
 */
export class ExcelProcessor implements FileProcessor {
  readonly name = "excel";
  readonly supportedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel", // .xls
  ];
  readonly supportedExtensions = [".xlsx", ".xls"];

  async process(file: FileWithData): Promise<ProcessedFileResult | null> {
    try {
      // Convert data URL to array buffer
      const arrayBuffer = await this.dataUrlToArrayBuffer(file.dataUrl);

      // Parse with xlsx
      const workbook = XLSX.read(arrayBuffer, { type: "array" });

      if (workbook.SheetNames.length === 0) {
        return null;
      }

      // Convert to JSON structure preserving sheet names
      const jsonData: Record<string, any[]> = {};
      workbook.SheetNames.forEach((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        jsonData[sheetName] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      });

      return {
        extractedText: JSON.stringify(jsonData, null, 2),
        format: "json",
        metadata: {
          sheetCount: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames,
        },
      };
    } catch (error) {
      getLogger().error("Error processing Excel file:", error);
      throw error;
    }
  }

  /**
   * Convert data URL to ArrayBuffer
   */
  private async dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
    // Handle blob URLs and HTTPS URLs via fetch
    if (
      dataUrl.startsWith("blob:") ||
      dataUrl.startsWith("http://") ||
      dataUrl.startsWith("https://")
    ) {
      const response = await fetch(dataUrl);
      return response.arrayBuffer();
    }

    // Data URL format: data:[<mediatype>][;base64],<data>
    const base64 = dataUrl.split(",")[1];
    const binary = atob(base64);
    const buffer = new ArrayBuffer(binary.length);
    const view = new Uint8Array(buffer);
    for (let i = 0; i < binary.length; i++) {
      view[i] = binary.charCodeAt(i);
    }
    return buffer;
  }
}
