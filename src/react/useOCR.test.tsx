import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useOCR } from "./useOCR";

const tesseractMock = vi.hoisted(() => ({
  loaded: 0,
  recognize: vi.fn(async () => ({ data: { text: "recognized text" } })),
}));

vi.mock("tesseract.js", () => {
  tesseractMock.loaded += 1;
  return { default: { recognize: tesseractMock.recognize } };
});

describe("useOCR", () => {
  it("loads tesseract.js only when recognition starts", async () => {
    const { result } = renderHook(() => useOCR());
    expect(tesseractMock.loaded).toBe(0);

    let context: string | null = null;
    await act(async () => {
      context = await result.current.extractOCRContext([
        { url: "https://example.com/scan.png", filename: "scan.png" },
      ]);
    });

    expect(tesseractMock.loaded).toBe(1);
    expect(tesseractMock.recognize).toHaveBeenCalledWith("https://example.com/scan.png", "eng");
    expect(context).toBe("[Context from OCR attachment scan.png]:\nrecognized text");
  });
});
