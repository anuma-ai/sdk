// @vitest-environment happy-dom
/**
 * pdf.ts resource handling with pdf.js mocked: documents are always destroyed, canvases are
 * released after encoding, pages render as size-capped JPEG, and text keeps pdf.js line breaks.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

const destroyDoc = vi.fn(() => Promise.resolve());
const destroyTask = vi.fn(() => Promise.resolve());
const getDocument = vi.fn();

vi.mock("pdfjs-dist", () => ({
  version: "test",
  GlobalWorkerOptions: {},
  getDocument: (...args: unknown[]) => getDocument(...args),
}));

import {
  computeRenderScale,
  convertPdfToImages,
  extractPdfPageTexts,
  extractTextFromPdf,
  joinPdfTextItems,
  renderPdfPages,
} from "./pdf";

function fakePage(items: object[], width = 600, height = 800) {
  return {
    getTextContent: () => Promise.resolve({ items }),
    getViewport: ({ scale }: { scale: number }) => ({
      width: width * scale,
      height: height * scale,
    }),
    render: vi.fn((_params: object) => ({ promise: Promise.resolve() })),
  };
}

interface FakeCanvas {
  width: number;
  height: number;
  ops: string[];
  toDataURL: ReturnType<typeof vi.fn>;
}

/** Stub `document.createElement("canvas")`; `noContextFor` canvases (by creation order) get none. */
function stubCanvases(noContextFor: number[] = []) {
  const canvases: FakeCanvas[] = [];
  const spy = vi.spyOn(document, "createElement").mockImplementation(() => {
    const index = canvases.length;
    const ops: string[] = [];
    const context = {
      fillStyle: "",
      fillRect: vi.fn(function (this: { fillStyle: string }) {
        ops.push(`fillRect:${this.fillStyle}`);
      }),
    };
    const canvas: FakeCanvas = {
      width: 0,
      height: 0,
      ops,
      toDataURL: vi.fn(function (this: { width: number }) {
        return `data:image/jpeg;base64,w${this.width}`;
      }),
    };
    Object.assign(canvas, {
      getContext: () => (noContextFor.includes(index) ? null : context),
    });
    canvases.push(canvas);
    return canvas as unknown as HTMLElement;
  });
  return { canvases, restore: () => spy.mockRestore() };
}

function fakeDoc(pages: ReturnType<typeof fakePage>[]) {
  return {
    numPages: pages.length,
    getPage: (n: number) => Promise.resolve(pages[n - 1]),
    destroy: destroyDoc,
  };
}

describe("joinPdfTextItems", () => {
  it("breaks lines where pdf.js reports hasEOL", () => {
    expect(
      joinPdfTextItems([
        { str: "Name", hasEOL: false },
        { str: "Qty", hasEOL: true },
        { str: "Widget", hasEOL: false },
        { str: "4", hasEOL: true },
        { type: "beginMarkedContent" },
      ])
    ).toBe("Name Qty\nWidget 4");
  });
});

describe("computeRenderScale", () => {
  it("renders at 1.5x unless that exceeds 1600px on the longest side", () => {
    expect(computeRenderScale(612, 792)).toBe(1.5);
    expect(computeRenderScale(2000, 1000)).toBe(0.8);
  });
});

describe("pdf.js lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("destroys the document after extracting text", async () => {
    getDocument.mockReturnValue({
      promise: Promise.resolve(fakeDoc([fakePage([{ str: "a", hasEOL: true }]), fakePage([])])),
      destroy: destroyTask,
    });
    expect(await extractPdfPageTexts("data:")).toEqual(["a", ""]);
    expect(destroyDoc).toHaveBeenCalledTimes(1);
  });

  it("destroys the document when a page fails", async () => {
    const doc = fakeDoc([fakePage([])]);
    doc.getPage = () => Promise.reject(new Error("bad page"));
    getDocument.mockReturnValue({ promise: Promise.resolve(doc), destroy: destroyTask });
    await expect(extractTextFromPdf("data:")).rejects.toThrow("bad page");
    expect(destroyDoc).toHaveBeenCalledTimes(1);
  });

  it("destroys the loading task when the document fails to open", async () => {
    getDocument.mockReturnValue({
      promise: Promise.reject(new Error("PasswordException")),
      destroy: destroyTask,
    });
    await expect(extractTextFromPdf("data:")).rejects.toThrow("PasswordException");
    expect(destroyTask).toHaveBeenCalledTimes(1);
  });

  it("renders the requested pages as JPEG, capped in size, and releases each canvas", async () => {
    const { canvases, restore } = stubCanvases();
    try {
      getDocument.mockReturnValue({
        promise: Promise.resolve(fakeDoc([fakePage([]), fakePage([], 2000, 1000), fakePage([])])),
        destroy: destroyTask,
      });
      const images = await convertPdfToImages("data:", undefined, [2, 9]);

      expect(images).toEqual(["data:image/jpeg;base64,w1600"]);
      expect(canvases[0].toDataURL).toHaveBeenCalledWith("image/jpeg", 0.8);
      expect(canvases[0].width).toBe(0);
      expect(canvases[0].height).toBe(0);
      expect(destroyDoc).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it("paints each page white before rendering, since JPEG turns transparent pixels black", async () => {
    const { canvases, restore } = stubCanvases();
    try {
      const page = fakePage([]);
      page.render.mockImplementation(() => {
        canvases[0].ops.push("render");
        return { promise: Promise.resolve() };
      });
      getDocument.mockReturnValue({
        promise: Promise.resolve(fakeDoc([page])),
        destroy: destroyTask,
      });
      await convertPdfToImages("data:");

      expect(canvases[0].ops).toEqual(["fillRect:#ffffff", "render"]);
      expect(page.render.mock.calls[0][0]).toMatchObject({ background: "#ffffff" });
    } finally {
      restore();
    }
  });

  it("reports which page each image came from when a page cannot be rendered", async () => {
    // The second canvas (page 2) has no 2d context.
    const { restore } = stubCanvases([1]);
    try {
      getDocument.mockReturnValue({
        promise: Promise.resolve(fakeDoc([fakePage([]), fakePage([]), fakePage([]), fakePage([])])),
        destroy: destroyTask,
      });
      const result = await renderPdfPages("data:", undefined, [1, 2, 4]);

      expect(result.pageCount).toBe(4);
      expect(result.pages.map((p) => p.pageNumber)).toEqual([1, 4]);
    } finally {
      restore();
    }
  });
});
