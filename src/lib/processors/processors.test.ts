// @vitest-environment node

/**
 * Node.js integration tests for file processors.
 *
 * These tests run in a real Node.js environment (not happy-dom) to verify
 * that processors work without browser globals like atob/btoa/document.
 * Test fixtures are generated programmatically to avoid binary file management.
 */

import ExcelJS from "exceljs";
import JSZip from "jszip";
import { describe, expect, it } from "vitest";

import { dataUrlToArrayBuffer, uint8ArrayToBase64 } from "./encoding";
import { ExcelProcessor } from "./ExcelProcessor";
import { preprocessFiles } from "./preprocessor";
import { ProcessorRegistry } from "./registry";
import type { FileWithData } from "./types";
import { WordProcessor } from "./WordProcessor";
import { ZipProcessor } from "./ZipProcessor";

// ── Helpers ──

function toDataUrl(buffer: ArrayBuffer | Buffer | Uint8Array, mimeType: string): string {
  const base64 = Buffer.from(buffer).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function makeFile(name: string, type: string, dataUrl: string, size = 1000): FileWithData {
  return { id: `test-${name}`, name, type, size, dataUrl };
}

async function createTestDocx(text: string): Promise<string> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`
  );
  zip.file(
    "_rels/.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`
  );
  zip.file(
    "word/document.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>${text}</w:t></w:r></w:p>
  </w:body>
</w:document>`
  );
  const buffer = await zip.generateAsync({ type: "uint8array" });
  return toDataUrl(
    buffer,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

async function createTestXlsx(): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("TestSheet");
  sheet.columns = [
    { header: "Name", key: "name" },
    { header: "Value", key: "value" },
  ];
  sheet.addRow({ name: "Alice", value: 42 });
  sheet.addRow({ name: "Bob", value: 99 });

  const buffer = await workbook.xlsx.writeBuffer();
  return toDataUrl(buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

// ── Encoding utility tests ──

describe("encoding utilities (Node.js)", () => {
  it("dataUrlToArrayBuffer decodes a base64 data URL", async () => {
    const text = "Hello, Node.js!";
    const base64 = Buffer.from(text).toString("base64");
    const dataUrl = `data:text/plain;base64,${base64}`;

    const result = await dataUrlToArrayBuffer(dataUrl);
    const decoded = Buffer.from(result).toString("utf-8");
    expect(decoded).toBe(text);
  });

  it("uint8ArrayToBase64 encodes binary data", () => {
    const data = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const base64 = uint8ArrayToBase64(data);
    expect(base64).toBe(Buffer.from("Hello").toString("base64"));
  });

  it("roundtrips binary data through base64", async () => {
    const original = new Uint8Array(256);
    for (let i = 0; i < 256; i++) original[i] = i;

    const base64 = uint8ArrayToBase64(original);
    const dataUrl = `data:application/octet-stream;base64,${base64}`;
    const result = await dataUrlToArrayBuffer(dataUrl);

    expect(new Uint8Array(result)).toEqual(original);
  });
});

// ── ExcelProcessor tests ──

describe("ExcelProcessor (Node.js)", () => {
  it("extracts spreadsheet data as JSON", async () => {
    const dataUrl = await createTestXlsx();
    const file = makeFile(
      "test.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dataUrl
    );

    const result = await new ExcelProcessor().process(file);
    expect(result).not.toBeNull();
    expect(result!.format).toBe("json");

    const parsed = JSON.parse(result!.extractedText);
    expect(parsed).toHaveProperty("TestSheet");
    expect(parsed.TestSheet).toHaveLength(2);
    expect(parsed.TestSheet[0].Name).toBe("Alice");
    expect(parsed.TestSheet[1].Value).toBe(99);
  });

  it("returns metadata with sheet info", async () => {
    const dataUrl = await createTestXlsx();
    const file = makeFile(
      "test.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dataUrl
    );

    const result = await new ExcelProcessor().process(file);
    expect(result!.metadata!.sheetCount).toBe(1);
    expect(result!.metadata!.sheetNames).toEqual(["TestSheet"]);
  });
});

// ── WordProcessor tests ──

describe("WordProcessor (Node.js)", () => {
  it("extracts text from a Word document", async () => {
    const dataUrl = await createTestDocx("Hello from Word document");
    const file = makeFile(
      "test.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      dataUrl
    );

    const result = await new WordProcessor().process(file);
    expect(result).not.toBeNull();
    expect(result!.format).toBe("plain");
    expect(result!.extractedText).toContain("Hello from Word document");
  });

  it("includes word count in metadata", async () => {
    const dataUrl = await createTestDocx("one two three four five");
    const file = makeFile(
      "test.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      dataUrl
    );

    const result = await new WordProcessor().process(file);
    expect(result!.metadata!.wordCount).toBe(5);
  });
});

// ── ZipProcessor tests ──

describe("ZipProcessor (Node.js)", () => {
  it("lists archive contents", async () => {
    const zip = new JSZip();
    zip.file("readme.txt", "This is a readme file.");
    zip.file("data/info.txt", "Some info inside a folder.");
    zip.folder("empty/");
    const buffer = await zip.generateAsync({ type: "uint8array" });
    const file = makeFile("test.zip", "application/zip", toDataUrl(buffer, "application/zip"));

    const result = await new ZipProcessor().process(file);
    expect(result).not.toBeNull();
    expect(result!.format).toBe("markdown");
    expect(result!.extractedText).toContain("Archive Contents");
    expect(result!.metadata!.fileCount).toBeGreaterThanOrEqual(2);
  });

  it("filters hidden files by default", async () => {
    const zip = new JSZip();
    zip.file("visible.txt", "visible");
    zip.file(".hidden", "hidden");
    zip.file("__MACOSX/file", "macosx");
    const buffer = await zip.generateAsync({ type: "uint8array" });
    const file = makeFile("test.zip", "application/zip", toDataUrl(buffer, "application/zip"));

    const result = await new ZipProcessor().process(file);
    expect(result!.extractedText).not.toContain(".hidden");
    expect(result!.extractedText).not.toContain("__MACOSX");
  });

  it("delegates to nested processors", async () => {
    // Build a DOCX as raw bytes, then wrap in a zip
    const docxDataUrl = await createTestDocx("Nested document content");
    const docxBuffer = Buffer.from(await dataUrlToArrayBuffer(docxDataUrl));

    const outerZip = new JSZip();
    outerZip.file("nested.docx", docxBuffer);
    const buffer = await outerZip.generateAsync({ type: "uint8array" });

    const registry = new ProcessorRegistry();
    registry.register(new WordProcessor());
    const zipProcessor = new ZipProcessor();
    zipProcessor.setRegistry(registry);
    registry.register(zipProcessor);

    const file = makeFile(
      "test.zip",
      "application/zip",
      toDataUrl(buffer, "application/zip"),
      buffer.length
    );

    const result = await zipProcessor.process(file);
    expect(result).not.toBeNull();
    expect(result!.extractedText).toContain("Nested document content");
    expect(result!.metadata!.processedFiles).toBe(1);
  });
});

// ── preprocessFiles orchestration tests ──

describe("preprocessFiles (Node.js)", () => {
  it("returns null content for empty files array", async () => {
    const result = await preprocessFiles([]);
    expect(result.extractedContent).toBeNull();
    expect(result.metadata.processedCount).toBe(0);
  });

  it("returns null content when processors disabled", async () => {
    const result = await preprocessFiles(
      [{ id: "1", name: "test.xlsx", type: "application/octet-stream", size: 100 }],
      { processors: null }
    );
    expect(result.extractedContent).toBeNull();
  });

  it("skips files without matching processor", async () => {
    const result = await preprocessFiles([
      {
        id: "1",
        name: "test.unknown",
        type: "application/x-unknown",
        size: 100,
        url: "data:application/x-unknown;base64,dGVzdA==",
      },
    ]);
    expect(result.extractedContent).toBeNull();
    expect(result.metadata.skippedCount).toBe(1);
  });

  it("skips oversized files", async () => {
    const result = await preprocessFiles(
      [
        {
          id: "1",
          name: "test.xlsx",
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 20_000_000,
        },
      ],
      { maxFileSizeBytes: 10_000_000 }
    );
    expect(result.metadata.skippedCount).toBe(1);
  });

  it("processes an Excel file end-to-end", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Data");
    sheet.columns = [{ header: "Item", key: "item" }];
    sheet.addRow({ item: "Widget" });

    const buffer = await workbook.xlsx.writeBuffer();
    const dataUrl = toDataUrl(
      buffer,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const result = await preprocessFiles([
      {
        id: "xlsx-1",
        name: "data.xlsx",
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        size: buffer.byteLength,
        url: dataUrl,
      },
    ]);

    expect(result.extractedContent).toContain("Widget");
    expect(result.metadata.processedCount).toBe(1);
    expect(result.preprocessedFileIds).toEqual(["xlsx-1"]);
  });

  it("calls onProgress and onError callbacks", async () => {
    const progressCalls: [number, number, string][] = [];
    const errorCalls: [string, Error][] = [];

    await preprocessFiles(
      [
        {
          id: "1",
          name: "bad.xlsx",
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 100,
          url: "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,bm90YXZhbGlk",
        },
      ],
      {
        onProgress: (current, total, fileName) => progressCalls.push([current, total, fileName]),
        onError: (fileName, error) => errorCalls.push([fileName, error]),
      }
    );

    expect(progressCalls).toHaveLength(1);
    expect(progressCalls[0]).toEqual([1, 1, "bad.xlsx"]);
    expect(errorCalls).toHaveLength(1);
    expect(errorCalls[0][0]).toBe("bad.xlsx");
  });
});
