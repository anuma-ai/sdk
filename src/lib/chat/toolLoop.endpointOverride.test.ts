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
async function captureRequest(endpointOverride?: string) {
  const captured: { endpoint?: string; body?: Record<string, unknown> } = {};
  const transport: StreamingTransport = (options) => {
    captured.endpoint = options.endpoint;
    captured.body = options.body;
    return { stream: makeTextStream("ok") };
  };

  await runToolLoop({
    messages: userMessages,
    // A model with no entry in the support map resolves to the Responses API.
    model: "test-model",
    token: "token",
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
});
