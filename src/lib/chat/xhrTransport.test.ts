/**
 * Unit coverage for the XHR-based React Native streaming transport.
 *
 * Pins the request shape (method/body/headers), the HEADERS_RECEIVED →
 * onStreamMeta capture (2xx-gated, fires once, before any data chunk), the
 * mid-stream abort contract (AbortError thrown into the iterator, never an
 * orderly `done`), and the data-line-only SSE parsing.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { StreamingTransportOptions } from "./toolLoop";
import { xhrTransport } from "./xhrTransport";

/**
 * Scripted XMLHttpRequest fake. Records open/setRequestHeader/send and lets
 * the test drive readyState/status/responseText through the handlers the
 * transport installs.
 */
class FakeXMLHttpRequest {
  static instances: FakeXMLHttpRequest[] = [];

  method = "";
  url = "";
  requestHeaders: Record<string, string> = {};
  sentBody: unknown = "(not sent)";
  sendCalled = false;

  readyState = 0;
  status = 0;
  statusText = "";
  responseText = "";
  responseHeaders: Record<string, string> = {};

  onprogress: (() => void) | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;
  onreadystatechange: (() => void) | null = null;

  constructor() {
    FakeXMLHttpRequest.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
    this.readyState = 1;
  }

  setRequestHeader(key: string, value: string) {
    this.requestHeaders[key] = value;
  }

  getResponseHeader(name: string): string | null {
    const match = Object.entries(this.responseHeaders).find(
      ([key]) => key.toLowerCase() === name.toLowerCase()
    );
    return match ? match[1] : null;
  }

  send(body?: unknown) {
    this.sendCalled = true;
    this.sentBody = body;
  }

  abort() {
    this.onabort?.();
  }

  // ── Test drivers ──

  /** Drive readyState 2 (HEADERS_RECEIVED) with a status + response headers. */
  receiveHeaders(status: number, headers: Record<string, string> = {}) {
    this.status = status;
    this.statusText = status === 200 ? "OK" : "Error";
    this.responseHeaders = headers;
    this.readyState = 2;
    this.onreadystatechange?.();
  }

  /** Drive readyState 3 with a new chunk of response text. */
  receiveChunk(text: string) {
    this.responseText += text;
    this.readyState = 3;
    this.onreadystatechange?.();
    this.onprogress?.();
  }

  /** Drive readyState 4 + onload. */
  finish() {
    this.readyState = 4;
    this.onreadystatechange?.();
    this.onload?.();
  }
}

function lastXhr(): FakeXMLHttpRequest {
  const xhr = FakeXMLHttpRequest.instances.at(-1);
  if (!xhr) throw new Error("no XHR was created");
  return xhr;
}

const baseOptions: StreamingTransportOptions = {
  baseUrl: "https://portal.test",
  endpoint: "/api/v1/responses",
  body: { model: "m", stream: true },
  token: "tok",
};

describe("xhrTransport", () => {
  beforeEach(() => {
    FakeXMLHttpRequest.instances = [];
    vi.stubGlobal("XMLHttpRequest", FakeXMLHttpRequest);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("defaults to POST with a JSON body and Content-Type", () => {
    xhrTransport(baseOptions);

    const xhr = lastXhr();
    expect(xhr.method).toBe("POST");
    expect(xhr.url).toBe("https://portal.test/api/v1/responses");
    expect(xhr.sentBody).toBe(JSON.stringify(baseOptions.body));
    expect(xhr.requestHeaders["Content-Type"]).toBe("application/json");
    expect(xhr.requestHeaders["Authorization"]).toBe("Bearer tok");
  });

  it("supports method: GET with no body — no Content-Type, send(undefined)", () => {
    xhrTransport({ ...baseOptions, method: "GET", body: undefined });

    const xhr = lastXhr();
    expect(xhr.method).toBe("GET");
    expect(xhr.sendCalled).toBe(true);
    expect(xhr.sentBody).toBeUndefined();
    expect(xhr.requestHeaders).not.toHaveProperty("Content-Type");
  });

  it("fires onStreamMeta exactly once at HEADERS_RECEIVED, before the first data chunk", async () => {
    const order: string[] = [];
    const result = xhrTransport({
      ...baseOptions,
      onStreamMeta: (meta) => order.push(`meta:${meta.inferenceId}`),
    });

    const xhr = lastXhr();
    xhr.receiveHeaders(200, { "X-Inference-ID": "inf-1" });
    xhr.receiveChunk('data: {"x":1}\n');
    // Re-driving readystatechange at states 3 and 4 must not re-fire meta.
    xhr.receiveChunk('data: {"x":2}\n');
    xhr.finish();

    const received: unknown[] = [];
    for await (const chunk of result.stream) {
      received.push(chunk);
      order.push("data");
    }

    expect(received).toEqual([{ x: 1 }, { x: 2 }]);
    expect(order).toEqual(["meta:inf-1", "data", "data"]);
  });

  it("does not fire onStreamMeta for non-2xx responses", async () => {
    const onStreamMeta = vi.fn();
    const onSseError = vi.fn();
    const result = xhrTransport({ ...baseOptions, onStreamMeta, onSseError });

    const xhr = lastXhr();
    xhr.receiveHeaders(500, { "X-Inference-ID": "inf-1" });
    xhr.finish();

    for await (const chunk of result.stream) void chunk;

    expect(onStreamMeta).not.toHaveBeenCalled();
    expect(onSseError).toHaveBeenCalled();
  });

  it("does not fire onStreamMeta when the header is missing", async () => {
    const onStreamMeta = vi.fn();
    const result = xhrTransport({ ...baseOptions, onStreamMeta });

    const xhr = lastXhr();
    xhr.receiveHeaders(200);
    xhr.receiveChunk('data: {"x":1}\n');
    xhr.finish();

    const received: unknown[] = [];
    for await (const chunk of result.stream) received.push(chunk);

    expect(received).toEqual([{ x: 1 }]);
    expect(onStreamMeta).not.toHaveBeenCalled();
  });

  it("leaves the stream unaffected when the onStreamMeta callback throws", async () => {
    const result = xhrTransport({
      ...baseOptions,
      onStreamMeta: () => {
        throw new Error("buggy observer");
      },
    });

    const xhr = lastXhr();
    xhr.receiveHeaders(200, { "X-Inference-ID": "inf-1" });
    xhr.receiveChunk('data: {"x":1}\n');
    xhr.finish();

    const received: unknown[] = [];
    for await (const chunk of result.stream) received.push(chunk);

    expect(received).toEqual([{ x: 1 }]);
  });

  it("throws an AbortError into the iterator on a mid-stream abort — never an orderly done", async () => {
    const controller = new AbortController();
    const result = xhrTransport({ ...baseOptions, signal: controller.signal });

    const xhr = lastXhr();
    xhr.receiveHeaders(200, { "X-Inference-ID": "inf-1" });
    xhr.receiveChunk('data: {"x":1}\n');

    const iterator = result.stream[Symbol.asyncIterator]();
    const first = await iterator.next();
    expect(first.done).toBe(false);
    expect(first.value).toEqual({ x: 1 });

    controller.abort();

    await expect(iterator.next()).rejects.toMatchObject({ name: "AbortError" });
  });

  it("yields only data payloads — SSE id: lines carry no state", async () => {
    const result = xhrTransport(baseOptions);

    const xhr = lastXhr();
    xhr.receiveHeaders(200);
    xhr.receiveChunk('id: 5\ndata: {"x":1}\n');
    xhr.finish();

    const received: unknown[] = [];
    for await (const chunk of result.stream) received.push(chunk);

    expect(received).toEqual([{ x: 1 }]);
  });
});
