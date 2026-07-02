// @vitest-environment happy-dom
/**
 * Regression coverage for PII-redaction forwarding in the Expo `useChatStorage`.
 *
 * A prior version accepted `piiRedaction` / `onPiiRedacted` in its options type
 * but never forwarded them to the inner `useChat` (the react entry forwarded
 * them; the expo entry did not). The result: mobile chat redaction was a silent
 * no-op regardless of the user's toggle. These tests lock in that:
 *   1. `piiRedaction: true` reaches `useChat` resolved to a real PiiRedactor,
 *      and `onPiiRedacted` is forwarded verbatim.
 *   2. `false` / a custom instance pass through unchanged.
 *   3. Instances for the SAME conversation share ONE redactor (so a placeholder
 *      minted by one useChatStorage instance can be de-anonymized by another —
 *      mobile mounts a singleton setup hook AND a per-conversation stream
 *      driver for the same conversation).
 */
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the inner useChat so we can inspect exactly what useChatStorage forwards.
vi.mock("./useChat", () => ({
  useChat: vi.fn(() => ({
    isLoading: false,
    sendMessage: vi.fn(),
    stop: vi.fn(),
    detach: vi.fn(),
    resumeStream: vi.fn(),
  })),
}));

import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import { isPiiRedactor, PiiRedactor } from "../lib/pii/redactor";
import { useChat } from "./useChat";
import { useChatStorage } from "./useChatStorage";

const mockUseChat = vi.mocked(useChat);

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `pii-forward-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

function lastUseChatOptions() {
  const calls = mockUseChat.mock.calls;
  return calls[calls.length - 1][0];
}

describe("useChatStorage PII forwarding (expo)", () => {
  beforeEach(() => {
    mockUseChat.mockClear();
  });

  it("forwards piiRedaction:true to useChat as a PiiRedactor and forwards onPiiRedacted", () => {
    const onPiiRedacted = vi.fn();
    renderHook(() =>
      useChatStorage({
        database: makeDatabase(),
        conversationId: "conv-1",
        piiRedaction: true,
        onPiiRedacted,
      })
    );
    const opts = lastUseChatOptions();
    expect(isPiiRedactor(opts.piiRedaction)).toBe(true);
    expect(opts.onPiiRedacted).toBe(onPiiRedacted);
  });

  it("passes piiRedaction:false through unchanged (redaction off)", () => {
    renderHook(() =>
      useChatStorage({ database: makeDatabase(), conversationId: "c", piiRedaction: false })
    );
    expect(lastUseChatOptions().piiRedaction).toBe(false);
  });

  it("passes a caller-provided PiiRedactor instance through unchanged", () => {
    const custom = new PiiRedactor();
    renderHook(() =>
      useChatStorage({ database: makeDatabase(), conversationId: "c", piiRedaction: custom })
    );
    expect(lastUseChatOptions().piiRedaction).toBe(custom);
  });

  it("shares ONE redactor across instances for the same conversation", () => {
    const db = makeDatabase();
    renderHook(() =>
      useChatStorage({ database: db, conversationId: "shared", piiRedaction: true })
    );
    const first = lastUseChatOptions().piiRedaction;
    mockUseChat.mockClear();
    renderHook(() =>
      useChatStorage({ database: db, conversationId: "shared", piiRedaction: true })
    );
    const second = lastUseChatOptions().piiRedaction;
    expect(isPiiRedactor(first)).toBe(true);
    expect(second).toBe(first);
  });

  it("forwards onServerToolCall + onToolCallArgumentsDelta to useChat (parity)", () => {
    const onServerToolCall = vi.fn();
    const onToolCallArgumentsDelta = vi.fn();
    renderHook(() =>
      useChatStorage({
        database: makeDatabase(),
        conversationId: "c",
        onServerToolCall,
        onToolCallArgumentsDelta,
      })
    );
    const opts = lastUseChatOptions();
    expect(opts.onServerToolCall).toBe(onServerToolCall);
    expect(opts.onToolCallArgumentsDelta).toBe(onToolCallArgumentsDelta);
  });
});
