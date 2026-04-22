import type ExcelJS from "exceljs";

import { getLogger } from "../logger";
import { dataUrlToArrayBuffer } from "./encoding";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

// Polyfill process.umask for edge runtimes (Cloudflare Workers) where unenv
// throws "process.umask is not implemented yet!".  fstream (a transitive dep
// of exceljs via unzipper) calls process.umask() at module-init time, so the
// polyfill must be in place before the first `import("exceljs")` resolves.
//
// Some runtimes freeze `process` or otherwise reject property assignment.  We
// track whether the polyfill succeeded so `ExcelProcessor.process()` can throw
// an explicit "unsupported runtime" error up front instead of letting the
// failure surface as an opaque error deep inside exceljs / fstream.
//
// We defer logging until `process()` is first called so the logger has been
// configured by the host; logging at module-init time risks running before
// the host's logger is installed.
let umaskPolyfilled = typeof process !== "undefined" && typeof process.umask === "function";
let umaskPolyfillFailure: { message: string; error?: unknown } | null = null;
if (typeof process !== "undefined" && typeof process.umask !== "function") {
  try {
    // 0o22 is the default umask on POSIX systems.  The value is only used by
    // fstream for file-permission calculations which are irrelevant in Workers.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
    (process as any).umask = (_mask?: number) => 0o22;
    umaskPolyfilled = typeof process.umask === "function";
    if (!umaskPolyfilled) {
      umaskPolyfillFailure = {
        message:
          "[ExcelProcessor] process.umask polyfill assignment did not stick; " +
          "ExcelProcessor.process() will throw on this runtime.",
      };
    }
  } catch (error) {
    umaskPolyfilled = false;
    umaskPolyfillFailure = {
      message:
        "[ExcelProcessor] Failed to polyfill process.umask; " +
        "ExcelProcessor.process() will throw on this runtime.",
      error,
    };
  }
}

/**
 * Processor for Excel files (.xlsx) that converts to JSON structure.
 *
 * Uses a dynamic import for exceljs so the heavy dependency tree is only
 * loaded when actually processing an Excel file.
 */
export class ExcelProcessor implements FileProcessor {
  readonly name = "excel";
  readonly supportedMimeTypes = [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  ];
  readonly supportedExtensions = [".xlsx"];

  private async loadExcelJS(): Promise<typeof ExcelJS> {
    const mod = await import("exceljs");
    return mod.default || mod;
  }

  async process(file: FileWithData): Promise<ProcessedFileResult | null> {
    if (umaskPolyfillFailure) {
      if (umaskPolyfillFailure.error !== undefined) {
        getLogger().warn(umaskPolyfillFailure.message, umaskPolyfillFailure.error);
      } else {
        getLogger().warn(umaskPolyfillFailure.message);
      }
      umaskPolyfillFailure = null;
    }
    if (!umaskPolyfilled && typeof process?.umask !== "function") {
      throw new Error(
        "ExcelProcessor: unsupported runtime. `process.umask` is missing and the " +
          "polyfill could not be installed (the host `process` object is likely " +
          "frozen or unavailable). Excel parsing cannot proceed on this runtime."
      );
    }
    try {
      const ExcelJSLib = await this.loadExcelJS();
      const arrayBuffer = await dataUrlToArrayBuffer(file.dataUrl);

      const workbook = new ExcelJSLib.Workbook();
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
      getLogger().error("Error processing Excel file:", error);
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
      if ("error" in value) return value.error;
      if ("text" in value) return (value as { text: string }).text;
    }
    return JSON.stringify(value);
  }
}
