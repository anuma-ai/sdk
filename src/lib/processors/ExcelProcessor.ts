import ExcelJS from "exceljs";

import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

/**
 * Processor for Excel files (.xlsx) that converts to JSON structure
 */
export class ExcelProcessor implements FileProcessor {
  readonly name = "excel";
  readonly supportedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  ];
  readonly supportedExtensions = [".xlsx"];

  async process(file: FileWithData): Promise<ProcessedFileResult | null> {
    try {
      const arrayBuffer = await this.dataUrlToArrayBuffer(file.dataUrl);

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      if (workbook.worksheets.length === 0) {
        return null;
      }

      const jsonData: Record<string, Record<string, unknown>[]> = {};
      for (const worksheet of workbook.worksheets) {
        const rows: Record<string, unknown>[] = [];
        const headerRow = worksheet.getRow(1);
        const headers: string[] = [];
        headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          headers[colNumber] = cell.text || `Column${colNumber}`;
        });

        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber === 1) return; // skip header
          const rowData: Record<string, unknown> = {};
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            const key = headers[colNumber] || `Column${colNumber}`;
            rowData[key] = this.resolveCellValue(cell.value);
          });
          rows.push(rowData);
        });

        jsonData[worksheet.name] = rows;
      }

      return {
        extractedText: JSON.stringify(jsonData, null, 2),
        format: "json",
        metadata: {
          sheetCount: workbook.worksheets.length,
          sheetNames: workbook.worksheets.map((ws) => ws.name),
        },
      };
    } catch (error) {
      console.error("Error processing Excel file:", error);
      throw error;
    }
  }

  private resolveCellValue(value: ExcelJS.CellValue): string | number | boolean {
    if (value === null || value === undefined) return "";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
      return value;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "object") {
      if ("richText" in value) return value.richText.map((rt) => rt.text).join("");
      if ("result" in value) return this.resolveCellValue(value.result);
      if ("text" in value) return (value as { text: string }).text;
    }
    return String(value);
  }

  private async dataUrlToArrayBuffer(dataUrl: string): Promise<ArrayBuffer> {
    if (
      dataUrl.startsWith("blob:") ||
      dataUrl.startsWith("http://") ||
      dataUrl.startsWith("https://")
    ) {
      const response = await fetch(dataUrl);
      return response.arrayBuffer();
    }

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
