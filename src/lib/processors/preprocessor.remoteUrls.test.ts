// @vitest-environment node

import { createServer } from "node:http";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { FileMetadata } from "../db/chat/types";
import { getLogger, noopLogger, setLogger } from "../logger";
import { dataUrlToArrayBuffer } from "./encoding";
import { PdfProcessor } from "./PdfProcessor";
import { preprocessFiles } from "./preprocessor";

function attachment(url: string): FileMetadata {
  return { id: "remote", name: "private.txt", type: "text/plain", size: 100, url };
}

describe("server file URL restrictions", () => {
  const requests: string[] = [];
  const logger = getLogger();
  const server = createServer((request, response) => {
    requests.push(request.url ?? "");
    if (request.url === "/redirect") {
      response.writeHead(302, { Location: "/private" });
      response.end();
      return;
    }
    response.end("internal service secret");
  });
  let origin: string;

  beforeAll(async () => {
    setLogger(noopLogger);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("The server has no address.");
    origin = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    requests.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  afterAll(async () => {
    setLogger(logger);
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it.each(["/private", "/redirect"])("rejects %s without an HTTP request", async (path) => {
    const onError = vi.fn();
    const result = await preprocessFiles([attachment(`${origin}${path}`)], { onError });

    expect(result.extractedContent).toBeNull();
    expect(result.preprocessedFileIds).toEqual([]);
    expect(result.metadata).toEqual({ processedCount: 0, skippedCount: 0, errorCount: 1 });
    expect(result.fileStatuses).toEqual([
      { fileId: "remote", fileName: "private.txt", status: "failed", reason: "error" },
    ]);
    expect(onError).toHaveBeenCalledWith("private.txt", expect.any(Error));
    expect(requests).toEqual([]);
  });

  it("extracts a data URL after it rejects a remote URL", async () => {
    const localFile = {
      ...attachment(`data:text/plain;base64,${Buffer.from("local attachment").toString("base64")}`),
      id: "local",
      name: "local.txt",
    };

    const result = await preprocessFiles([attachment(`${origin}/private`), localFile]);

    expect(requests).toEqual([]);
    expect(result.extractedContent).toContain("local attachment");
    expect(result.extractedContent).not.toContain("internal service secret");
    expect(result.preprocessedFileIds).toEqual(["local"]);
    expect(result.metadata).toEqual({ processedCount: 1, skippedCount: 0, errorCount: 1 });
    expect(result.fileStatuses).toEqual([
      { fileId: "remote", fileName: "private.txt", status: "failed", reason: "error" },
      { fileId: "local", fileName: "local.txt", status: "extracted" },
    ]);
  });

  it.each([
    "http://127.0.0.1/private",
    "http://10.0.0.1/private",
    "http://169.254.169.254/latest/meta-data/",
    "https://[::1]/private",
    "http://internal.example/private",
    "https://files.example/redirect",
    "HTTP://127.0.0.1/private",
    "file:///etc/passwd",
    "//127.0.0.1/private",
  ])("rejects %s in the shared decoder before fetch", async (url) => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("internal service secret"));

    await expect(dataUrlToArrayBuffer(url)).rejects.toThrow(
      "Server file preprocessing requires a data URL or blob URL."
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("rejects a remote URL before the PDF processor receives it", async () => {
    const processor = new PdfProcessor();
    const processSpy = vi
      .spyOn(processor, "process")
      .mockResolvedValue({ extractedText: "internal service secret", format: "plain" });
    const file = {
      ...attachment(`${origin}/private`),
      name: "private.pdf",
      type: "application/pdf",
    };

    const result = await preprocessFiles([file], { processors: [processor] });

    expect(result.extractedContent).toBeNull();
    expect(result.metadata.errorCount).toBe(1);
    expect(processSpy).not.toHaveBeenCalled();
  });

  it("extracts a data URL without fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const url = `data:text/plain;base64,${Buffer.from("local attachment").toString("base64")}`;

    const result = await preprocessFiles([attachment(url)]);

    expect(result.extractedContent).toContain("local attachment");
    expect(result.metadata.processedCount).toBe(1);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("extracts a local blob URL", async () => {
    const url = URL.createObjectURL(new Blob(["local attachment"]));
    try {
      const result = await preprocessFiles([attachment(url)]);

      expect(result.extractedContent).toContain("local attachment");
      expect(result.metadata.processedCount).toBe(1);
      expect(requests).toEqual([]);
    } finally {
      URL.revokeObjectURL(url);
    }
  });

  it("preserves remote URL decoding outside Node", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("browser file"));
    vi.stubGlobal("process", undefined);

    const result = await dataUrlToArrayBuffer("https://files.example/attachment.txt");

    expect(new TextDecoder().decode(result)).toBe("browser file");
    expect(fetchSpy).toHaveBeenCalledWith("https://files.example/attachment.txt");
  });
});
