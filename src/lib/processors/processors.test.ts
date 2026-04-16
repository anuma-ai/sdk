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
import { getSupportedFileTypes, isSupportedFile, preprocessFiles } from "./preprocessor";
import { ProcessorRegistry } from "./registry";
import { TextProcessor } from "./TextProcessor";
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

// ── TextProcessor tests ──

describe("TextProcessor (Node.js)", () => {
  it("decodes a UTF-8 markdown file", async () => {
    const content = "# Hello\n\nThis is **markdown** content.";
    const file = makeFile(
      "notes.md",
      "text/markdown",
      toDataUrl(Buffer.from(content), "text/markdown")
    );

    const result = await new TextProcessor().process(file);
    expect(result).not.toBeNull();
    expect(result!.format).toBe("markdown");
    expect(result!.extractedText).toBe(content);
  });

  it("decodes a plain .txt file", async () => {
    const content = "Just some plain text.";
    const file = makeFile("notes.txt", "text/plain", toDataUrl(Buffer.from(content), "text/plain"));

    const result = await new TextProcessor().process(file);
    expect(result!.format).toBe("plain");
    expect(result!.extractedText).toBe(content);
  });

  it("flags JSON files with the json format hint", async () => {
    const content = '{"hello":"world"}';
    const file = makeFile(
      "data.json",
      "application/json",
      toDataUrl(Buffer.from(content), "application/json")
    );

    const result = await new TextProcessor().process(file);
    expect(result!.format).toBe("json");
    expect(result!.extractedText).toBe(content);
  });

  it("falls back to extension when MIME type is application/octet-stream", async () => {
    // Browsers/OSes sometimes report .md as octet-stream; the registry's
    // extension fallback should still route it to TextProcessor.
    const content = "# from octet-stream";
    const result = await preprocessFiles([
      {
        id: "1",
        name: "readme.md",
        type: "application/octet-stream",
        size: content.length,
        url: toDataUrl(Buffer.from(content), "application/octet-stream"),
      },
    ]);

    expect(result.extractedContent).toContain("from octet-stream");
    expect(result.extractedContent).toContain("[Extracted content from readme.md]");
    expect(result.preprocessedFileIds).toEqual(["1"]);
  });

  it("returns null for an empty file", async () => {
    const file = makeFile("empty.txt", "text/plain", toDataUrl(Buffer.from(""), "text/plain"));
    const result = await new TextProcessor().process(file);
    expect(result).toBeNull();
  });

  it("preserves multi-byte UTF-8 characters", async () => {
    const content = "héllo 🌍 日本語";
    const file = makeFile("utf8.txt", "text/plain", toDataUrl(Buffer.from(content), "text/plain"));

    const result = await new TextProcessor().process(file);
    expect(result!.extractedText).toBe(content);
  });

  it("throws on an invalid data URL", async () => {
    const file = makeFile("bad.txt", "text/plain", "not-a-data-url");
    await expect(new TextProcessor().process(file)).rejects.toThrow();
  });
});

// ── Registry query method tests ──

describe("ProcessorRegistry queries", () => {
  it("isSupported returns true for a registered MIME type", () => {
    const registry = new ProcessorRegistry();
    registry.register(new TextProcessor());

    expect(registry.isSupported({ name: "notes.md", type: "text/markdown" })).toBe(true);
    expect(registry.isSupported({ name: "data.json", type: "application/json" })).toBe(true);
  });

  it("isSupported falls back to extension when MIME type is missing or generic", () => {
    const registry = new ProcessorRegistry();
    registry.register(new TextProcessor());

    expect(registry.isSupported({ name: "readme.md", type: "" })).toBe(true);
    expect(registry.isSupported({ name: "readme.md", type: "application/octet-stream" })).toBe(
      true
    );
  });

  it("isSupported returns false for unknown formats", () => {
    const registry = new ProcessorRegistry();
    registry.register(new TextProcessor());

    expect(registry.isSupported({ name: "song.mp3", type: "audio/mpeg" })).toBe(false);
    expect(registry.isSupported({ name: "image.png", type: "image/png" })).toBe(false);
  });

  it("getSupportedMimeTypes returns deduplicated, sorted types from all processors", () => {
    const registry = new ProcessorRegistry();
    registry.register(new TextProcessor());
    registry.register(new WordProcessor());

    const mimeTypes = registry.getSupportedMimeTypes();

    // Sorted
    expect(mimeTypes).toEqual([...mimeTypes].sort());
    // Deduplicated (Set semantics)
    expect(new Set(mimeTypes).size).toBe(mimeTypes.length);
    // Includes types from both processors
    expect(mimeTypes).toContain("text/markdown");
    expect(mimeTypes).toContain(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
  });

  it("getSupportedExtensions returns deduplicated, sorted extensions", () => {
    const registry = new ProcessorRegistry();
    registry.register(new TextProcessor());
    registry.register(new WordProcessor());

    const extensions = registry.getSupportedExtensions();

    expect(extensions).toEqual([...extensions].sort());
    expect(new Set(extensions).size).toBe(extensions.length);
    expect(extensions).toContain(".md");
    expect(extensions).toContain(".docx");
    // All entries include the leading dot so they're <input accept>-ready
    expect(extensions.every((e) => e.startsWith("."))).toBe(true);
  });

  it("query methods return empty when no processors registered", () => {
    const registry = new ProcessorRegistry();
    expect(registry.isSupported({ name: "x.md", type: "text/markdown" })).toBe(false);
    expect(registry.getSupportedMimeTypes()).toEqual([]);
    expect(registry.getSupportedExtensions()).toEqual([]);
  });
});

// ── Top-level support helpers tests ──

describe("isSupportedFile / getSupportedFileTypes", () => {
  it("isSupportedFile accepts files handled by default processors", () => {
    expect(isSupportedFile({ name: "notes.md", type: "text/markdown" })).toBe(true);
    expect(isSupportedFile({ name: "doc.pdf", type: "application/pdf" })).toBe(true);
    expect(isSupportedFile({ name: "data.csv", type: "text/csv" })).toBe(true);
    expect(isSupportedFile({ name: "archive.zip", type: "application/zip" })).toBe(true);
  });

  it("isSupportedFile rejects formats with no processor", () => {
    expect(isSupportedFile({ name: "song.mp3", type: "audio/mpeg" })).toBe(false);
    expect(isSupportedFile({ name: "video.mp4", type: "video/mp4" })).toBe(false);
    // Images are handled separately as image_url content parts, not by processors
    expect(isSupportedFile({ name: "photo.png", type: "image/png" })).toBe(false);
  });

  it("isSupportedFile uses extension fallback when MIME type is unreliable", () => {
    // Reproduces the original .md upload bug: macOS/Windows often report .md
    // as text/plain or octet-stream; extension match keeps validation aligned
    // with what preprocessFiles will actually accept.
    expect(isSupportedFile({ name: "readme.md", type: "" })).toBe(true);
    expect(isSupportedFile({ name: "readme.md", type: "application/octet-stream" })).toBe(true);
  });

  it("getSupportedFileTypes returns mimeTypes and extensions arrays", () => {
    const { mimeTypes, extensions } = getSupportedFileTypes();

    expect(Array.isArray(mimeTypes)).toBe(true);
    expect(Array.isArray(extensions)).toBe(true);

    // Includes contributions from each default processor
    expect(mimeTypes).toContain("application/pdf");
    expect(mimeTypes).toContain("text/markdown");
    expect(extensions).toContain(".md");
    expect(extensions).toContain(".pdf");
    expect(extensions).toContain(".xlsx");
    expect(extensions).toContain(".docx");
    expect(extensions).toContain(".zip");
  });

  it("getSupportedFileTypes is consistent with isSupportedFile", () => {
    const { mimeTypes, extensions } = getSupportedFileTypes();

    // Every advertised MIME type should pass validation
    for (const mimeType of mimeTypes) {
      expect(isSupportedFile({ name: "anything", type: mimeType })).toBe(true);
    }
    // Every advertised extension should pass validation when MIME is missing
    for (const ext of extensions) {
      expect(isSupportedFile({ name: `file${ext}`, type: "" })).toBe(true);
    }
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
