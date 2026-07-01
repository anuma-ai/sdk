// @vitest-environment happy-dom
/**
 * Per-call PII masking of embedding inputs on the Expo send path.
 *
 * Regression guard for the "Per-call PII skips embeddings" finding: a per-request
 * `piiRedaction: true` (while the hook-level option is OFF) must mask the text
 * that reaches the embeddings endpoint, not just the LLM/summary paths. Before the
 * fix, stored-message + tool-filter embeddings used the HOOK-level masker (identity
 * when the hook option is off), so raw PII leaked to the embeddings API on those
 * paths. They now use the per-call `maskForCall`.
 *
 * Only the text SENT to the embeddings server is masked — the locally stored
 * message content stays the real value.
 */

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";

// Clean (non-detached) loop result so the send stores a user + assistant row,
// each of which is embedded via embedMessageAsync(..., maskForCall).
vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...orig, runToolLoop: vi.fn() };
});

// Spy on generateEmbedding so we can inspect the exact text that would leave the
// device. Keep every other memoryEngine export intact.
vi.mock("../lib/memoryEngine", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/memoryEngine")>();
  return {
    ...orig,
    generateEmbedding: vi.fn(async () => [0.1, 0.2, 0.3]),
  };
});

import { runToolLoop } from "../lib/chat/toolLoop";
import { generateEmbedding } from "../lib/memoryEngine";
import { useChatStorage } from "./useChatStorage";

const mockRunToolLoop = vi.mocked(runToolLoop);
const mockGenerateEmbedding = vi.mocked(generateEmbedding);

const EMAIL = "alice@example.com";
const USER_TEXT = `Please email me at ${EMAIL} about the quarterly report`;

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `embed-mask-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function responsesShape(text: string) {
  return {
    id: `resp-${Math.random().toString(36).slice(2)}`,
    model: "test-model",
    object: "response",
    output: [
      {
        type: "message",
        role: "assistant",
        content: [{ type: "output_text", text }],
        status: "completed",
      },
    ],
    usage: undefined,
  };
}

/** All text args generateEmbedding was called with this test. */
function embeddedTexts(): string[] {
  return mockGenerateEmbedding.mock.calls.map((c) => c[0]);
}

describe("useChatStorage per-call embedding masking (expo)", () => {
  let db: Database;
  // getServerTools hits the network on the storage path; make it fail fast so the
  // send falls through to the async stored-message embedding (generateEmbedding is
  // mocked and never touches fetch).
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    db = makeDatabase();
    fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("no network"));
    mockRunToolLoop.mockResolvedValue({
      data: responsesShape("Sure, I will follow up."),
      error: null,
    } as never);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("masks the embedding input when a per-request piiRedaction:true overrides a hook-level OFF", async () => {
    const { result } = renderHook(() =>
      // Hook-level redaction is OFF — the leak the finding describes.
      useChatStorage({ database: db, conversationId: "conv_mask", getToken: async () => "tok" })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: USER_TEXT }] }],
        model: "test-model",
        piiRedaction: true, // per-request override, hook is off
      });
    });

    await waitFor(() => expect(mockGenerateEmbedding).toHaveBeenCalled());

    const texts = embeddedTexts();
    // The user message reached the embeddings endpoint MASKED, never raw.
    expect(texts.some((t) => t.includes("[EMAIL]"))).toBe(true);
    expect(texts.some((t) => t.includes(EMAIL))).toBe(false);

    // But the locally stored message keeps the real value (only the wire is masked).
    const stored = await result.current.getMessages("conv_mask");
    const userRow = stored.find((m) => m.role === "user");
    expect(userRow?.content).toBe(USER_TEXT);
  });

  it("leaves embedding input raw when redaction is off everywhere (OFF path unchanged)", async () => {
    const { result } = renderHook(() =>
      useChatStorage({ database: db, conversationId: "conv_off", getToken: async () => "tok" })
    );

    await act(async () => {
      await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: USER_TEXT }] }],
        model: "test-model",
        // no piiRedaction override, hook off → redaction fully off
      });
    });

    await waitFor(() => expect(mockGenerateEmbedding).toHaveBeenCalled());

    const texts = embeddedTexts();
    // Byte-identical to the pre-fix behavior: the raw email is embedded as-is.
    expect(texts.some((t) => t.includes(EMAIL))).toBe(true);
    expect(texts.some((t) => t.includes("[EMAIL]"))).toBe(false);
  });
});
