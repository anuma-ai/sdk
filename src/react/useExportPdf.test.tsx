import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as pdfExport from "../lib/pdf-export";
import { useExportPdf } from "./useExportPdf";

vi.mock("../lib/pdf-export", async (importOriginal) => {
  const orig = await importOriginal<typeof pdfExport>();
  return {
    ...orig,
    exportElementToPdf: vi.fn(),
    exportMarkdownToPdf: vi.fn(),
  };
});

const mockExportElement = vi.mocked(pdfExport.exportElementToPdf);
const mockExportMarkdown = vi.mocked(pdfExport.exportMarkdownToPdf);

describe("useExportPdf", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the expected shape", () => {
    const { result } = renderHook(() => useExportPdf());

    expect(result.current.exportElementToPdf).toBeTypeOf("function");
    expect(result.current.exportMarkdownToPdf).toBeTypeOf("function");
    expect(result.current.downloadElementAsPdf).toBeTypeOf("function");
    expect(result.current.downloadMarkdownAsPdf).toBeTypeOf("function");
    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("exportMarkdownToPdf returns blob and manages isExporting state", async () => {
    const fakeBlob = new Blob(["pdf"], { type: "application/pdf" });
    mockExportMarkdown.mockResolvedValue(fakeBlob);

    const { result } = renderHook(() => useExportPdf());

    let blob: Blob | undefined;
    await act(async () => {
      blob = await result.current.exportMarkdownToPdf("# Test");
    });

    expect(blob).toBe(fakeBlob);
    expect(mockExportMarkdown).toHaveBeenCalledWith("# Test");
    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("exportElementToPdf returns blob and manages isExporting state", async () => {
    const fakeBlob = new Blob(["pdf"], { type: "application/pdf" });
    mockExportElement.mockResolvedValue(fakeBlob);

    const { result } = renderHook(() => useExportPdf());
    const element = document.createElement("div");

    let blob: Blob | undefined;
    await act(async () => {
      blob = await result.current.exportElementToPdf(element);
    });

    expect(blob).toBe(fakeBlob);
    expect(mockExportElement).toHaveBeenCalledWith(element);
    expect(result.current.isExporting).toBe(false);
  });

  it("captures error on failure", async () => {
    const error = new Error("PDF generation failed");
    mockExportMarkdown.mockRejectedValue(error);

    const { result } = renderHook(() => useExportPdf());

    await act(async () => {
      try {
        await result.current.exportMarkdownToPdf("# Test");
      } catch {
        // expected
      }
    });

    expect(result.current.isExporting).toBe(false);
    expect(result.current.error).toBe(error);
  });

  it("clears previous error on new export", async () => {
    const error = new Error("fail");
    mockExportMarkdown.mockRejectedValueOnce(error);
    mockExportMarkdown.mockResolvedValueOnce(new Blob(["ok"]));

    const { result } = renderHook(() => useExportPdf());

    // First call fails
    await act(async () => {
      try {
        await result.current.exportMarkdownToPdf("fail");
      } catch {
        // expected
      }
    });
    expect(result.current.error).toBe(error);

    // Second call succeeds — error cleared
    await act(async () => {
      await result.current.exportMarkdownToPdf("ok");
    });
    expect(result.current.error).toBeNull();
  });
});
