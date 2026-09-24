import type ExcelJS from "exceljs";

import { getLogger } from "../logger";
import { dataUrlToArrayBuffer } from "./encoding";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";

// Polyfill process.umask for edge runtimes (Cloudflare Workers) where unenv
// throws "process.umask is not implemented yet!".  fstream (a transitive dep
// of exceljs via unzipper) calls process.umask() at module-init time, so the
// polyfill must be in place before the first `import("exceljs")` resolves.
if (typeof process !== "undefined" && typeof process.umask !== "function") {
  // 0o22 is the default umask on POSIX systems.  The value is only used by
  // fstream for file-permission calculations which are irrelevant in Workers.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
  (process as any).umask = (_mask?: number) => 0o22;
}

/**
 * Maximum data rows emitted per sheet. Rows past it are dropped with a marker line.
 */
// TODO(ceiling): a fixed row count ignores row width; upgrade to a token-based budget, or to
// retrieval (query the sheet on demand) for large workbooks.
const MAX_ROWS_PER_SHEET = 2_000;

/** Quote a CSV field when it contains a delimiter, quote or line break (RFC 4180). */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/**
 * Header names for a sheet: blank headers become `ColumnN`, and repeated names get a `_2`, `_3`…
 * suffix so no column silently shadows another.
 */
function uniqueHeaders(raw: Array<string | undefined>, columnCount: number): string[] {
  const seen = new Map<string, number>();
  const headers: string[] = [];
  for (let col = 1; col <= columnCount; col++) {
    const base = raw[col]?.trim() || `Column${col}`;
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    headers.push(count === 1 ? base : `${base}_${count}`);
  }
  return headers;
}

/**
 * Processor for Excel files (.xlsx) that converts each sheet to CSV.
 *
 * CSV rather than JSON: JSON repeated every header on every row, several times the characters
 * for the same data, and ran into the text caps long before the data did.
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

  private readonly maxRowsPerSheet: number;

  constructor(options: { maxRowsPerSheet?: number } = {}) {
    this.maxRowsPerSheet = options.maxRowsPerSheet ?? MAX_ROWS_PER_SHEET;
  }

  private async loadExcelJS(): Promise<typeof ExcelJS> {
    const mod = await import("exceljs");
    return mod.default || mod;
  }

  async process(file: FileWithData): Promise<ProcessedFileResult | null> {
    try {
      const ExcelJSLib = await this.loadExcelJS();
      const arrayBuffer = await dataUrlToArrayBuffer(file.dataUrl);

      const workbook = new ExcelJSLib.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      if (workbook.worksheets.length === 0) {
        return null;
      }

      let truncated = false;
      const sections: string[] = [];
      for (const worksheet of workbook.worksheets) {
        const rawHeaders: string[] = [];
        let columnCount = 0;
        worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, colNumber) => {
          rawHeaders[colNumber] = cell.text;
          columnCount = Math.max(columnCount, colNumber);
        });

        const rows: string[][] = [];
        let totalRows = 0;
        worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
          if (rowNumber === 1) return; // header
          totalRows++;
          if (rows.length >= this.maxRowsPerSheet) return;
          const values: string[] = [];
          row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
            values[colNumber - 1] = String(this.resolveCellValue(cell.value));
            columnCount = Math.max(columnCount, colNumber);
          });
          rows.push(values);
        });

        const headers = uniqueHeaders(rawHeaders, columnCount);
        const lines = [headers, ...rows].map((values) =>
          headers.map((_, i) => csvField(values[i] ?? "")).join(",")
        );
        let section = `## Sheet: ${worksheet.name}\n\n\`\`\`csv\n${lines.join("\n")}\n\`\`\``;
        if (totalRows > rows.length) {
          truncated = true;
          section += `\n[truncated: showing the first ${rows.length} of ${totalRows} data rows of sheet "${worksheet.name}"]`;
        }
        sections.push(section);
      }

      return {
        extractedText: sections.join("\n\n"),
        format: "markdown",
        metadata: {
          sheetCount: workbook.worksheets.length,
          sheetNames: workbook.worksheets.map((ws) => ws.name),
          truncated,
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
