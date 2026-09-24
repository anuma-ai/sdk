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
import { afterEach, describe, expect, it, vi } from "vitest";

import { base64ToUint8Array, dataUrlToArrayBuffer, uint8ArrayToBase64 } from "./encoding";
import { ExcelProcessor } from "./ExcelProcessor";
import { formatFileProcessingNotes } from "./fileStatusNotes";
import { buildPdfImageNote } from "./PdfProcessor";
import { getSupportedFileTypes, isSupportedFile, preprocessFiles } from "./preprocessor";
import { ProcessorRegistry } from "./registry";
import { TextProcessor } from "./TextProcessor";
import type { FileProcessor, FileWithData, ProcessedFileResult } from "./types";
import { WordProcessor } from "./WordProcessor";
import { ZipProcessor } from "./ZipProcessor";

// ── Helpers ──

function toDataUrl(buffer: ArrayBuffer | Buffer | Uint8Array, mimeType: string): string {
  // `Buffer.from` has separate overloads for ArrayBuffer and for array-likes, and
  // the union matches neither — normalize to a view first.
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  const base64 = Buffer.from(bytes).toString("base64");
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

  it("base64ToUint8Array roundtrips with uint8ArrayToBase64", () => {
    const original = new Uint8Array(256);
    for (let i = 0; i < 256; i++) original[i] = i;

    const decoded = base64ToUint8Array(uint8ArrayToBase64(original));
    expect(decoded).toEqual(original);
  });
});

// Deterministic pseudo-random fill so the large-buffer test is reproducible without Math.random.
function fillPseudoRandom(buf: Uint8Array): Uint8Array {
  let x = 0x9e3779b9;
  for (let i = 0; i < buf.length; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    buf[i] = x & 0xff;
  }
  return buf;
}

// Fast byte-equality for large buffers. vitest's `toEqual` deep-diffs element-by-element with rich
// diffing, which is far too slow (multi-second) on multi-MB typed arrays.
function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// Regression for the iCloud backup crash: the old upload path did
// `btoa(String.fromCharCode(...bytes))`, which spreads every byte as an argument and throws
// `RangeError: Maximum call stack size exceeded` above ~100–500KB — so any real backup crashed.
// These tests force the browser fallback (Buffer undefined) and prove a multi-MB buffer both
// encodes without throwing and round-trips to identical bytes.
describe("encoding utilities (browser fallback, Buffer undefined)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("encodes a 2MB buffer without throwing and round-trips exactly", () => {
    vi.stubGlobal("Buffer", undefined);
    expect(typeof Buffer).toBe("undefined");

    const original = fillPseudoRandom(new Uint8Array(2 * 1024 * 1024)); // 2MB

    let base64 = "";
    expect(() => {
      base64 = uint8ArrayToBase64(original);
    }).not.toThrow();

    const decoded = base64ToUint8Array(base64);
    expect(bytesEqual(decoded, original)).toBe(true);
  });

  it("chunk-boundary sizes round-trip (no mid-stream padding)", () => {
    vi.stubGlobal("Buffer", undefined);

    // Sizes around the 0x8000*3 chunk boundary, incl. non-multiples of 3.
    for (const size of [
      0,
      1,
      2,
      3,
      0x8000 * 3 - 1,
      0x8000 * 3,
      0x8000 * 3 + 1,
      0x8000 * 3 * 2 + 7,
    ]) {
      const original = fillPseudoRandom(new Uint8Array(size));
      const decoded = base64ToUint8Array(uint8ArrayToBase64(original));
      expect(bytesEqual(decoded, original)).toBe(true);
    }
  });

  it("matches the Node/Buffer encoding for the same bytes", () => {
    const original = fillPseudoRandom(new Uint8Array(300 * 1024)); // 300KB, above the old crash range
    const viaBuffer = uint8ArrayToBase64(original); // Buffer path (Node)

    vi.stubGlobal("Buffer", undefined);
    const viaBrowser = uint8ArrayToBase64(original); // chunked btoa path

    expect(viaBrowser).toBe(viaBuffer);
  });
});

// ── ExcelProcessor tests ──

describe("ExcelProcessor (Node.js)", () => {
  it("extracts each sheet as CSV", async () => {
    const dataUrl = await createTestXlsx();
    const file = makeFile(
      "test.xlsx",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      dataUrl
    );

    const result = await new ExcelProcessor().process(file);
    expect(result).not.toBeNull();
    expect(result!.format).toBe("markdown");
    expect(result!.extractedText).toBe(
      "## Sheet: TestSheet\n\n```csv\nName,Value\nAlice,42\nBob,99\n```"
    );
    expect(result!.metadata!.truncated).toBe(false);
  });

  it("quotes CSV fields, de-duplicates header names and names blank headers", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("S");
    sheet.addRow(["Amount", "Amount", "", "Note"]);
    sheet.addRow([1, 2, 3, 'says "hi", then\nleaves']);
    const dataUrl = toDataUrl(
      await workbook.xlsx.writeBuffer(),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const result = await new ExcelProcessor().process(makeFile("s.xlsx", "", dataUrl));
    expect(result!.extractedText).toContain(
      'Amount,Amount_2,Column3,Note\n1,2,3,"says ""hi"", then\nleaves"'
    );
  });

  it("caps rows per sheet and says how many were dropped", async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Big");
    sheet.addRow(["n"]);
    for (let i = 1; i <= 5; i++) sheet.addRow([i]);
    const dataUrl = toDataUrl(
      await workbook.xlsx.writeBuffer(),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const result = await new ExcelProcessor({ maxRowsPerSheet: 2 }).process(
      makeFile("big.xlsx", "", dataUrl)
    );
    expect(result!.extractedText).toContain("n\n1\n2\n```");
    expect(result!.extractedText).not.toContain("\n3\n");
    expect(result!.extractedText).toContain(
      '[truncated: showing the first 2 of 5 data rows of sheet "Big"]'
    );
    expect(result!.metadata!.truncated).toBe(true);
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

// ── Robustness: encodings, MIME parameters, archive limits ──

describe("TextProcessor byte-order marks", () => {
  const text = "naïve café — 東京";

  it("decodes UTF-16 LE with a BOM", async () => {
    const bytes = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]);
    const result = await new TextProcessor().process(
      makeFile("u.csv", "text/csv", toDataUrl(bytes, "text/csv"))
    );
    expect(result!.extractedText).toBe(text);
  });

  it("decodes UTF-16 BE with a BOM", async () => {
    const le = Buffer.from(text, "utf16le");
    const be = Buffer.alloc(le.length);
    for (let i = 0; i < le.length; i += 2) {
      be[i] = le[i + 1];
      be[i + 1] = le[i];
    }
    const bytes = Buffer.concat([Buffer.from([0xfe, 0xff]), be]);
    const result = await new TextProcessor().process(
      makeFile("u.txt", "text/plain", toDataUrl(bytes, "text/plain"))
    );
    expect(result!.extractedText).toBe(text);
  });

  it("strips a UTF-8 BOM", async () => {
    const bytes = Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(text)]);
    const result = await new TextProcessor().process(
      makeFile("u.txt", "text/plain", toDataUrl(bytes, "text/plain"))
    );
    expect(result!.extractedText).toBe(text);
  });
});

describe("ProcessorRegistry MIME matching", () => {
  it("ignores MIME parameters and case", () => {
    const registry = new ProcessorRegistry();
    registry.register(new TextProcessor());
    // Extension-less names so only the MIME type can match.
    expect(registry.findProcessor({ name: "export", type: "text/csv; charset=utf-8" })?.name).toBe(
      "text"
    );
    expect(registry.findProcessor({ name: "export", type: "Application/JSON" })?.name).toBe("text");
  });

  it("keeps the json format hint for a parameterized JSON type", async () => {
    const result = await new TextProcessor().process(
      makeFile("blob", "application/json; charset=utf-8", toDataUrl(Buffer.from("{}"), "x/y"))
    );
    expect(result!.format).toBe("json");
  });
});

/** A stand-in for PdfProcessor that "renders" every page as an image (pdf.js can't run here). */
function fakeScannedPdfProcessor(pages: number): FileProcessor {
  return {
    name: "pdf",
    supportedMimeTypes: ["application/pdf"],
    supportedExtensions: [".pdf"],
    process: async (file): Promise<ProcessedFileResult> => {
      const imagePages = Array.from({ length: pages }, (_, i) => i + 1);
      const imageNote = buildPdfImageNote(file.name, imagePages, [], pages);
      return {
        extractedText: imageNote,
        format: "plain",
        imageDataUrls: imagePages.map((n) => `data:image/jpeg;base64,${n}`),
        metadata: { pageCount: pages, imageNote, imagePages, omittedImagePages: [] },
      };
    },
  };
}

describe("ZipProcessor limits", () => {
  it("does not claim page images for a nested scanned PDF, since they are discarded", async () => {
    const zip = new JSZip();
    zip.file("scan.pdf", "%PDF-fake");
    const buffer = await zip.generateAsync({ type: "uint8array" });

    const registry = new ProcessorRegistry();
    registry.register(fakeScannedPdfProcessor(2));
    const zipProcessor = new ZipProcessor();
    zipProcessor.setRegistry(registry);

    const result = await zipProcessor.process(
      makeFile("a.zip", "application/zip", toDataUrl(buffer, "application/zip"))
    );
    expect(result!.extractedText).not.toContain("included in this message");
    expect(result!.extractedText).toContain(
      "pages 1-2 could not be included as images because of the image limit"
    );
    expect(result!.metadata!.truncated).toBe(true);
  });

  it("skips an entry whose declared size is over the limit without inflating it", async () => {
    const zip = new JSZip();
    zip.file("big.txt", "x".repeat(5_000));
    zip.file("small.txt", "small content");
    const buffer = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    const loaded = await JSZip.loadAsync(buffer);
    const asyncSpy = vi.spyOn(Object.getPrototypeOf(loaded.file("big.txt")!), "async");

    const registry = new ProcessorRegistry();
    registry.register(new TextProcessor());
    const zipProcessor = new ZipProcessor({ maxFileSize: 1_000 });
    zipProcessor.setRegistry(registry);

    const result = await zipProcessor.process(
      makeFile("a.zip", "application/zip", toDataUrl(buffer, "application/zip"))
    );
    expect(result!.extractedText).toContain("small content");
    expect(result!.extractedText).not.toContain("xxxxx");
    // Only small.txt was inflated.
    expect(asyncSpy).toHaveBeenCalledTimes(1);
    asyncSpy.mockRestore();
  });

  it("logs a failed entry at warn without its path", async () => {
    const warn = vi.fn();
    const { consoleLogger, setLogger } = await import("../logger");
    setLogger({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() });
    try {
      const zip = new JSZip();
      zip.file("secret-plan.txt", "hello");
      const buffer = await zip.generateAsync({ type: "uint8array" });
      const registry = new ProcessorRegistry();
      registry.register({
        name: "text",
        supportedMimeTypes: ["text/plain"],
        supportedExtensions: [".txt"],
        process: () => Promise.reject(new Error("boom")),
      });
      const zipProcessor = new ZipProcessor();
      zipProcessor.setRegistry(registry);
      await zipProcessor.process(
        makeFile("a.zip", "application/zip", toDataUrl(buffer, "application/zip"))
      );
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0][0])).toContain("entry #1 (text, text/plain)");
      expect(String(warn.mock.calls[0][0])).not.toContain("secret-plan");
    } finally {
      setLogger(consoleLogger);
    }
  });
});

// ── preprocessFiles: caps, statuses, image budget, timeout ──

function textFile(id: string, name: string, content: string) {
  return {
    id,
    name,
    type: "text/plain",
    size: content.length,
    url: toDataUrl(Buffer.from(content), "text/plain"),
  };
}

describe("preprocessFiles caps", () => {
  it("cuts a file at maxExtractedCharsPerFile with a marker naming what was kept", async () => {
    const result = await preprocessFiles([textFile("a", "a.txt", "abcdefghij")], {
      maxExtractedCharsPerFile: 4,
    });
    expect(result.extractedContent).toBe(
      "[Extracted content from a.txt]\nabcd\n[truncated: showing the first 4 of 10 characters of a.txt]"
    );
    expect(result.fileStatuses).toEqual([{ fileId: "a", fileName: "a.txt", status: "truncated" }]);
  });

  it("shares maxExtractedCharsTotal across files in order", async () => {
    const result = await preprocessFiles(
      [
        textFile("a", "a.txt", "aaaaaa"),
        textFile("b", "b.txt", "bbbbbb"),
        textFile("c", "c.txt", "cccccc"),
      ],
      { maxExtractedCharsTotal: 9 }
    );
    expect(result.extractedContent).toContain("[Extracted content from a.txt]\naaaaaa");
    expect(result.extractedContent).toContain(
      "bbb\n[truncated: showing the first 3 of 6 characters of b.txt]"
    );
    expect(result.extractedContent).toContain(
      "[truncated: showing the first 0 of 6 characters of c.txt]"
    );
    expect(result.extractedContent).not.toContain("ccc");
    expect(result.fileStatuses.map((s) => s.status)).toEqual([
      "extracted",
      "truncated",
      "truncated",
    ]);
  });

  it("applies the default per-file cap of 100,000 characters", async () => {
    const result = await preprocessFiles([textFile("a", "a.txt", "x".repeat(150_000))]);
    expect(result.extractedContent).toContain(
      "[truncated: showing the first 100000 of 150000 characters of a.txt]"
    );
  });
});

describe("preprocessFiles fileStatuses", () => {
  it("reports one status per non-image file, with the reason", async () => {
    const result = await preprocessFiles(
      [
        textFile("ok", "ok.txt", "hello"),
        { ...textFile("big", "big.txt", "x"), size: 50 },
        { id: "img", name: "p.png", type: "image/png", size: 1, url: "data:image/png;base64,AA==" },
        {
          id: "bigimg",
          name: "q.jpg",
          type: "image/jpeg",
          size: 99,
          url: "data:image/jpeg;base64,AA==",
        },
        { id: "bin", name: "a.bin", type: "application/x-unknown", size: 1, url: "data:," },
        { id: "nourl", name: "n.txt", type: "text/plain", size: 1 },
        textFile("blank", "blank.txt", "   "),
        {
          id: "bad",
          name: "bad.xlsx",
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          size: 10,
          url: "data:application/octet-stream;base64,bm90YXZhbGlk",
        },
      ],
      { maxFileSizeBytes: 20 }
    );
    expect(result.fileStatuses).toEqual([
      { fileId: "ok", fileName: "ok.txt", status: "extracted" },
      { fileId: "big", fileName: "big.txt", status: "skipped", reason: "too_large" },
      { fileId: "bin", fileName: "a.bin", status: "skipped", reason: "unsupported_type" },
      { fileId: "nourl", fileName: "n.txt", status: "skipped", reason: "no_data" },
      { fileId: "blank", fileName: "blank.txt", status: "skipped", reason: "empty" },
      { fileId: "bad", fileName: "bad.xlsx", status: "failed", reason: "error" },
    ]);
  });

  it("reports a timeout, and clears the timer once a file finishes", async () => {
    vi.useFakeTimers();
    try {
      const hanging: FileProcessor = {
        name: "text",
        supportedMimeTypes: ["text/plain"],
        supportedExtensions: [],
        process: () => new Promise(() => undefined),
      };
      const pending = preprocessFiles([textFile("h", "h.txt", "x")], {
        processors: [hanging],
        timeoutMs: 1_000,
      });
      await vi.advanceTimersByTimeAsync(1_000);
      const result = await pending;
      expect(result.fileStatuses).toEqual([
        { fileId: "h", fileName: "h.txt", status: "failed", reason: "timeout" },
      ]);

      await preprocessFiles([textFile("a", "a.txt", "fast")], { timeoutMs: 60_000 });
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks a scanned PDF rendered_as_images, and rewrites its note when the image budget drops pages", async () => {
    const pdf = (id: string) => ({
      id,
      name: `${id}.pdf`,
      type: "application/pdf",
      size: 10,
      url: "data:application/pdf;base64,AA==",
    });
    const result = await preprocessFiles([pdf("one"), pdf("two")], {
      processors: [fakeScannedPdfProcessor(15)],
    });
    // 20 images total: 15 from the first file, 5 from the second.
    expect(result.imageContentUrls).toHaveLength(20);
    expect(result.fileStatuses.map((s) => s.status)).toEqual(["rendered_as_images", "truncated"]);
    expect(result.extractedContent).toContain(
      "[one.pdf: scanned/image-based PDF (no extractable text) — pages 1-15 rendered as images and included in this message for visual analysis]"
    );
    expect(result.extractedContent).toContain(
      "[two.pdf: scanned/image-based PDF (no extractable text) — pages 1-5 rendered as images and included in this message for visual analysis; pages 6-15 not included because of the image limit, so their content is not available]"
    );
  });

  it("never logs file names", async () => {
    const calls: unknown[][] = [];
    const record = (...args: unknown[]) => calls.push(args);
    const { consoleLogger, setLogger } = await import("../logger");
    setLogger({ debug: record, info: record, warn: record, error: record });
    try {
      await preprocessFiles(
        [
          { ...textFile("big", "private-big.txt", "x"), size: 50 },
          { id: "n", name: "private-nourl.txt", type: "text/plain", size: 1 },
          {
            id: "bad",
            name: "private-bad.xlsx",
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size: 10,
            url: "data:application/octet-stream;base64,bm90YXZhbGlk",
          },
        ],
        { maxFileSizeBytes: 20 }
      );
      expect(calls.length).toBeGreaterThanOrEqual(3);
      expect(JSON.stringify(calls.map((c) => String(c[0])))).not.toContain("private-");
    } finally {
      setLogger(consoleLogger);
    }
  });
});

describe("formatFileProcessingNotes", () => {
  it("writes one line per unread file and nothing for read ones", () => {
    expect(
      formatFileProcessingNotes([
        { fileId: "1", fileName: "ok.pdf", status: "extracted" },
        { fileId: "2", fileName: "order.pdf", status: "skipped", reason: "too_large" },
        { fileId: "3", fileName: "locked.pdf", status: "failed", reason: "error" },
      ])
    ).toBe(
      "[order.pdf could not be read: the file is larger than 10 MB]\n" +
        "[locked.pdf could not be read: its text could not be extracted (it may be password-protected or damaged)]"
    );
    expect(
      formatFileProcessingNotes([{ fileId: "1", fileName: "a", status: "truncated" }])
    ).toBeNull();
  });
});
