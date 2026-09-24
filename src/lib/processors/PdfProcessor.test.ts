// @vitest-environment node
/**
 * PdfProcessor's page decisions, with pdf.js mocked out (it cannot render in the test runtimes):
 * which pages are rendered as images, how the per-document image budget is spent, and what the
 * note tells the model.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../pdf", () => ({
  extractPdfPageTexts: vi.fn(),
  renderPdfPages: vi.fn(),
}));

import { extractPdfPageTexts, renderPdfPages } from "../pdf";
import {
  buildPdfImageNote,
  formatPageList,
  PdfProcessor,
  rewriteImageNote,
  selectPdfImagePages,
} from "./PdfProcessor";
import type { FileWithData } from "./types";

const mockTexts = vi.mocked(extractPdfPageTexts);
const mockImages = vi.mocked(renderPdfPages);

const FILE: FileWithData = {
  id: "f",
  name: "report.pdf",
  type: "application/pdf",
  size: 10,
  dataUrl: "data:application/pdf;base64,AA==",
};
const TEXT = "This page has a real text layer with plenty of characters.";

/** Renders every requested page (or the first `max` of `docPages`), except those in `fail`. */
function fakeRenderer(docPages = 0, fail: number[] = []) {
  return (_url: string, max?: number, pages?: number[]) => {
    const requested =
      pages ?? Array.from({ length: Math.min(max ?? docPages, docPages) }, (_, i) => i + 1);
    return Promise.resolve({
      pageCount: docPages || Math.max(0, ...requested),
      pages: requested
        .filter((n) => !fail.includes(n))
        .map((n) => ({ pageNumber: n, dataUrl: `data:image/jpeg;base64,p${n}` })),
    });
  };
}
const fakeImages = fakeRenderer();

describe("selectPdfImagePages", () => {
  it("picks pages whose text is empty or near-empty, within the budget", () => {
    expect(selectPdfImagePages([TEXT, "", "  3  ", TEXT, ""], 2)).toEqual({
      rendered: [2, 3],
      omitted: [5],
    });
  });
});

describe("formatPageList", () => {
  it("collapses runs into ranges", () => {
    expect(formatPageList([3])).toBe("page 3");
    expect(formatPageList([1, 2, 3, 5, 7, 8])).toBe("pages 1-3, 5, 7-8");
  });
});

describe("PdfProcessor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImages.mockImplementation(fakeImages);
  });

  it("returns text only, with no rendering, when every page has text", async () => {
    mockTexts.mockResolvedValue([TEXT, TEXT]);
    const result = await new PdfProcessor().process(FILE);
    expect(result).toEqual({ extractedText: `${TEXT}\n\n${TEXT}`, format: "plain" });
    expect(mockImages).not.toHaveBeenCalled();
  });

  it("renders only the scanned pages of a mixed PDF and says which they are", async () => {
    mockTexts.mockResolvedValue([TEXT, "", TEXT, "2"]);
    const result = await new PdfProcessor().process(FILE);

    expect(mockImages).toHaveBeenCalledWith(FILE.dataUrl, undefined, [2, 4]);
    expect(result!.imageDataUrls).toEqual([
      "data:image/jpeg;base64,p2",
      "data:image/jpeg;base64,p4",
    ]);
    expect(result!.extractedText).toBe(
      "[report.pdf: 2 of 4 pages have no extractable text (pages 2, 4) — pages 2, 4 rendered as images and included in this message for visual analysis]" +
        `\n\n${TEXT}\n\n${TEXT}\n\n2`
    );
    expect(result!.metadata!.truncated).toBe(false);
  });

  it("states how many scanned pages were left out by the 20-page image budget", async () => {
    mockTexts.mockResolvedValue(Array.from({ length: 25 }, () => ""));
    const result = await new PdfProcessor().process(FILE);

    expect(result!.imageDataUrls).toHaveLength(20);
    expect(result!.extractedText).toBe(
      "[report.pdf: scanned/image-based PDF (no extractable text) — pages 1-20 rendered as images and included in this message for visual analysis; pages 21-25 not included because of the image limit, so their content is not available]"
    );
    expect(result!.metadata!.truncated).toBe(true);
  });

  it("keeps the text of a mixed PDF when rendering fails", async () => {
    mockTexts.mockResolvedValue([TEXT, ""]);
    mockImages.mockRejectedValue(new Error("no canvas"));
    const result = await new PdfProcessor().process(FILE);
    expect(result!.extractedText).toContain(TEXT);
    expect(result!.imageDataUrls).toBeUndefined();
    expect(result!.extractedText).not.toContain("included in this message");
  });

  it("names the pages actually rendered when an earlier page could not be", async () => {
    mockTexts.mockResolvedValue([TEXT, "", TEXT, ""]);
    mockImages.mockImplementation(fakeRenderer(4, [2]));
    const result = await new PdfProcessor().process(FILE);

    expect(result!.imageDataUrls).toEqual(["data:image/jpeg;base64,p4"]);
    expect(result!.metadata!.imagePages).toEqual([4]);
    expect(result!.metadata!.omittedImagePages).toEqual([2]);
    expect(result!.extractedText).toContain(
      "page 4 rendered as images and included in this message for visual analysis; page 2 not included"
    );
    expect(result!.metadata!.truncated).toBe(true);
  });

  it("reports the pages past the image budget when text extraction threw", async () => {
    mockTexts.mockRejectedValue(new Error("bad xref"));
    mockImages.mockImplementation(fakeRenderer(30));
    const result = await new PdfProcessor().process(FILE);

    expect(mockImages).toHaveBeenCalledWith(FILE.dataUrl, 20);
    expect(result!.imageDataUrls).toHaveLength(20);
    expect(result!.metadata!.pageCount).toBe(30);
    expect(result!.metadata!.truncated).toBe(true);
    expect(result!.extractedText).toBe(
      "[report.pdf: scanned/image-based PDF (no extractable text) — pages 1-20 rendered as images and included in this message for visual analysis; pages 21-30 not included because of the image limit, so their content is not available]"
    );
  });

  it("throws when a PDF can be neither read nor rendered (password-protected, damaged)", async () => {
    mockTexts.mockRejectedValue(new Error("PasswordException"));
    mockImages.mockRejectedValue(new Error("PasswordException"));
    await expect(new PdfProcessor().process(FILE)).rejects.toThrow("PasswordException");
  });
});

describe("rewriteImageNote", () => {
  it("keeps a file name with $ replacement patterns literal", async () => {
    mockImages.mockImplementation(fakeImages);
    mockTexts.mockResolvedValue(["", ""]);
    const name = "q$&1$'$$.pdf";
    const result = (await new PdfProcessor().process({ ...FILE, name }))!;

    expect(rewriteImageNote(result, name, 1)).toBe(buildPdfImageNote(name, [1], [2], 2));
  });

  it("rewrites the note to match the images a consumer kept", async () => {
    mockImages.mockImplementation(fakeImages);
    mockTexts.mockResolvedValue([TEXT, "", ""]);
    const result = (await new PdfProcessor().process(FILE))!;

    expect(rewriteImageNote(result, FILE.name, 2)).toBe(result.extractedText);
    expect(rewriteImageNote(result, FILE.name, 1)).toContain(
      "page 2 rendered as images and included in this message for visual analysis; page 3 not included because of the image limit"
    );
    expect(rewriteImageNote(result, FILE.name, 0)).toBe(
      `${buildPdfImageNote(FILE.name, [], [2, 3], 3)}\n\n${TEXT}`
    );
  });
});
