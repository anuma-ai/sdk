/**
 * Per-call endpoint override coverage for runToolLoop.
 *
 * `endpointOverride` lets a caller redirect a request to a different path
 * without changing anything else: the strategy resolved from the model still
 * drives the request body and response parsing, and only the URL path differs.
 * These tests pin (a) the default path when no override is set and (b) that an
 * override changes ONLY the path — the request body stays byte-identical.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import * as sseModule from "../../client/core/serverSentEvents.gen";
import * as embeddingsModule from "../memoryEngine/embeddings";
import type { StreamingTransport } from "./toolLoop";
import { runToolLoop } from "./toolLoop";

vi.mock("../../client/core/serverSentEvents.gen", async (importOriginal) => {
  const orig = await importOriginal<typeof sseModule>();
  return { ...orig, createSseClient: vi.fn() };
});

vi.mock("../memoryEngine/embeddings", async (importOriginal) => {
  const orig = await importOriginal<typeof embeddingsModule>();
  return { ...orig, generateEmbedding: vi.fn() };
});

/** A stream that yields one text delta then completes — a healthy response. */
function makeTextStream(text: string) {
  return (async function* () {
    yield { type: "response.created", response: { id: "r", model: "m" } };
    yield { type: "response.output_text.delta", delta: { OfString: text } };
    yield {
      type: "response.completed",
      response: { usage: { input_tokens: 1, output_tokens: 1 } },
    };
  })();
}

const userMessages = [{ role: "user" as const, content: [{ type: "text" as const, text: "hi" }] }];

/**
 * Runs the loop with a capturing transport and returns the path + body the
 * transport received for the single request.
 */
const testBaseUrl = "https://portal.test";

async function captureRequest(endpointOverride?: string) {
  const captured: {
    endpoint?: string;
    baseUrl?: string;
    body?: Record<string, unknown>;
    called: boolean;
  } = {
    called: false,
  };
  const transport: StreamingTransport = (options) => {
    captured.called = true;
    captured.endpoint = options.endpoint;
    captured.baseUrl = options.baseUrl;
    captured.body = options.body;
    return { stream: makeTextStream("ok") };
  };

  await runToolLoop({
    messages: userMessages,
    // A model with no entry in the support map resolves to the Responses API.
    model: "test-model",
    token: "token",
    baseUrl: testBaseUrl,
    endpointOverride,
    transport,
  });

  return captured;
}

describe("runToolLoop endpointOverride", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the model-resolved path when no override is given", async () => {
    const { endpoint } = await captureRequest();
    expect(endpoint).toBe("/api/v1/responses");
  });

  it("uses the given path when an override is set", async () => {
    const { endpoint } = await captureRequest("/api/v1/utility/responses");
    expect(endpoint).toBe("/api/v1/utility/responses");
  });

  it("changes only the path — the request body is byte-identical", async () => {
    const withoutOverride = await captureRequest();
    const withOverride = await captureRequest("/api/v1/utility/responses");

    expect(withOverride.endpoint).toBe("/api/v1/utility/responses");
    expect(withoutOverride.endpoint).toBe("/api/v1/responses");
    // Same body content...
    expect(withOverride.body).toEqual(withoutOverride.body);
    // ...and byte-for-byte identical once serialized.
    expect(JSON.stringify(withOverride.body)).toBe(JSON.stringify(withoutOverride.body));
  });

  // Greptile P1: a malformed override must not silently corrupt the request URL.
  describe("override validation (Greptile P1)", () => {
    it("a valid root-relative override resolves to baseUrl + path", async () => {
      const c = await captureRequest("/api/v1/utility/responses");
      expect(c.endpoint).toBe("/api/v1/utility/responses");
      expect(`${c.baseUrl}${c.endpoint}`).toBe("https://portal.test/api/v1/utility/responses");
    });

    it("normalizes a missing leading slash onto the path", async () => {
      const c = await captureRequest("api/v1/utility/responses");
      expect(c.endpoint).toBe("/api/v1/utility/responses");
      // Without normalization this would concatenate into the broken
      // "https://portal.testapi/v1/utility/responses".
      expect(`${c.baseUrl}${c.endpoint}`).toBe("https://portal.test/api/v1/utility/responses");
    });

    /**
     * An invalid override is a pre-flight validation failure, not a crash: it
     * must fire onRunStart THEN onRunError (the "onRunStart fires for every
     * invocation" invariant, I-1), resolve to `{data:null,error}`, and never
     * dispatch the request. A raw throw would crash an un-wrapped direct caller
     * and skip the terminal hook.
     */
    async function runWithBadOverride(endpointOverride: string) {
      let called = false;
      const events: string[] = [];
      let errorEvent: { error: string } | undefined;
      const result = await runToolLoop({
        messages: userMessages,
        model: "test-model",
        token: "token",
        baseUrl: testBaseUrl,
        endpointOverride,
        transport: () => {
          called = true;
          return { stream: makeTextStream("ok") };
        },
        hooks: {
          onRunStart: () => {
            events.push("start");
          },
          onRunError: (e) => {
            events.push("error");
            errorEvent = e;
          },
        },
      });
      return { result, called, events, errorEvent };
    }

    it("empty override: onRunStart+onRunError fire, resolves to error, no dispatch, no throw", async () => {
      const { result, called, events, errorEvent } = await runWithBadOverride("");
      expect(events).toEqual(["start", "error"]);
      expect(called).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toMatch(/endpointOverride must be a non-empty, root-relative path/);
      expect(errorEvent?.error).toMatch(/non-empty, root-relative path/);
    });

    it("whitespace-only override is rejected the same way", async () => {
      const { result, called, events } = await runWithBadOverride("   ");
      expect(events).toEqual(["start", "error"]);
      expect(called).toBe(false);
      expect(result.error).toMatch(/non-empty, root-relative path/);
    });

    // I-2: off-origin targets would send the Bearer token to another host.
    it("rejects a protocol-relative override (//evil.com)", async () => {
      const { result, called } = await runWithBadOverride("//evil.com/api/v1/responses");
      expect(called).toBe(false);
      expect(result.data).toBeNull();
      expect(result.error).toMatch(/not a protocol-relative or absolute URL/);
    });

    it("rejects an absolute-URL override (https://evil.com)", async () => {
      const { result, called } = await runWithBadOverride("https://evil.com/api/v1/responses");
      expect(called).toBe(false);
      expect(result.error).toMatch(/not a protocol-relative or absolute URL/);
    });
  });
});
