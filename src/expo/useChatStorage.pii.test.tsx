// @vitest-environment happy-dom
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
  const opts = calls[calls.length - 1][0];
  if (!opts) throw new Error("useChat was called without options");
  return opts;
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
