import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSseClient } from "../../client/core/serverSentEvents.gen";
import { useChatStorage as useExpoChatStorage } from "../../expo/useChatStorage";
import { useChatStorage as useReactChatStorage } from "../../react/useChatStorage";
import { clearAllEncryptionState } from "../../react/useEncryption";
import { runToolLoop } from "../chat/toolLoop";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";
import { localChatBackend } from "../storage/WatermelonChatStorageAdapter";
import type { PiiSpan } from "./ner";
import { PiiRedactor } from "./redactor";

vi.mock("../../client/core/serverSentEvents.gen", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../client/core/serverSentEvents.gen")>()),
  createSseClient: vi.fn(),
}));

vi.mock("../chat/toolLoop", async (importOriginal) => {
  const original = await importOriginal<typeof import("../chat/toolLoop")>();
  return {
    ...original,
    runToolLoop: vi.fn((options: Parameters<typeof original.runToolLoop>[0]) =>
      original.runToolLoop({ ...options, transport: undefined })
    ),
  };
});

function makeDatabase(): Database {
  return new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `pii-session-${Math.random().toString(36).slice(2)}`,
    }),
    modelClasses: sdkModelClasses,
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

async function* modelResponse(gate?: Promise<void>) {
  await gate;
  yield { type: "response.created", response: { id: "r", model: "test-model" } };
  yield { type: "response.output_text.delta", delta: { OfString: "[EMAIL_1]" } };
  yield { type: "response.completed", response: {} };
}

const sendArgs = (text = "hello") => ({
  messages: [{ role: "user" as const, content: [{ type: "text" as const, text }] }],
  model: "test-model",
  skipStorage: true,
  serverTools: [],
});

function lastRedactor(): PiiRedactor {
  const redactor = vi.mocked(runToolLoop).mock.calls.at(-1)?.[0].piiRedaction;
  expect(redactor).toBeInstanceOf(PiiRedactor);
  return redactor as PiiRedactor;
}

describe.each([
  ["react", useReactChatStorage],
  ["expo", useExpoChatStorage],
] as const)("%s PII account sessions", (_platform, useChatStorage) => {
  let database: Database;
  const getToken = () => Promise.resolve("token");

  beforeEach(() => {
    clearAllEncryptionState();
    vi.clearAllMocks();
    database = makeDatabase();
    vi.mocked(createSseClient).mockImplementation(
      () => ({ stream: modelResponse() }) as ReturnType<typeof createSseClient>
    );
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Unexpected network request"));
  });

  afterEach(() => {
    cleanup();
    clearAllEncryptionState();
    vi.restoreAllMocks();
  });

  function options(walletAddress = "account-a", storage = database) {
    return {
      database: storage,
      walletAddress,
      getToken,
      piiRedaction: true,
      smoothing: { enabled: false },
      autoEmbedMessages: false,
    };
  }

  it.each([null, "shared"])("isolates accounts for conversation %s", async (conversationId) => {
    const { result: a } = renderHook(() =>
      useChatStorage({ ...options(), conversationId: conversationId ?? undefined })
    );
    await act(async () => {
      await a.current.sendMessage(sendArgs("email alice@example.com"));
    });
    const first = lastRedactor();
    expect(first.deAnonymize("[EMAIL_1]")).toBe("alice@example.com");

    const onData = vi.fn();
    const { result: b } = renderHook(() =>
      useChatStorage({
        ...options("account-b"),
        conversationId: conversationId ?? undefined,
        onData,
      })
    );
    await act(async () => {
      const result = await b.current.sendMessage(sendArgs());
      expect(result.error).toBeNull();
      expect(JSON.stringify(result.data)).not.toContain("alice@example.com");
    });
    expect(lastRedactor()).not.toBe(first);
    expect(onData.mock.calls.flat().join("")).toBe("[EMAIL_1]");
  });

  it("isolates storage instances and shares mappings within one account and conversation", async () => {
    const chatBackend = localChatBackend(database);
    const { result: a } = renderHook(() => useChatStorage({ ...options(), chatBackend }));
    await act(async () => {
      await a.current.sendMessage(sendArgs("email alice@example.com"));
    });
    const first = lastRedactor();

    const { result: shared } = renderHook(() => useChatStorage({ ...options(), chatBackend }));
    await act(async () => {
      await shared.current.sendMessage(sendArgs());
    });
    expect(lastRedactor()).toBe(first);

    const otherDatabase = makeDatabase();
    const { result: other } = renderHook(() =>
      useChatStorage({ ...options("account-a", otherDatabase), chatBackend })
    );
    await act(async () => {
      const result = await other.current.sendMessage(sendArgs());
      expect(JSON.stringify(result.data)).not.toContain("alice@example.com");
    });
    expect(lastRedactor()).not.toBe(first);
  });

  it("clears mappings on logout after unmount and uses a fresh redactor after remount", async () => {
    const { result, unmount } = renderHook(() => useChatStorage(options()));
    await act(async () => {
      await result.current.sendMessage(sendArgs("email alice@example.com"));
    });
    const first = lastRedactor();
    unmount();
    clearAllEncryptionState();
    expect(first.size).toBe(0);

    const { result: remounted } = renderHook(() => useChatStorage(options()));
    await act(async () => {
      const result = await remounted.current.sendMessage(sendArgs());
      expect(JSON.stringify(result.data)).not.toContain("alice@example.com");
    });
    expect(lastRedactor()).not.toBe(first);
  });

  it("clears mappings after the last shared hook unmounts", async () => {
    const firstHook = renderHook(() => useChatStorage(options()));
    const secondHook = renderHook(() => useChatStorage(options()));
    await act(async () => {
      await firstHook.result.current.sendMessage(sendArgs("email alice@example.com"));
    });
    const first = lastRedactor();
    firstHook.unmount();
    expect(first.size).toBe(1);
    secondHook.unmount();
    expect(first.size).toBe(0);
  });

  it("uses active mappings in StrictMode and after logout without a remount", async () => {
    const { result } = renderHook(() => useChatStorage(options()), {
      wrapper: ({ children }) => <StrictMode>{children}</StrictMode>,
    });
    await act(async () => {
      const response = await result.current.sendMessage(sendArgs("email alice@example.com"));
      expect(response.error).toBeNull();
      expect(JSON.stringify(response.data)).toContain("alice@example.com");
    });
    const first = lastRedactor();
    act(() => clearAllEncryptionState());
    expect(first.size).toBe(0);
    await act(async () => {
      const response = await result.current.sendMessage(sendArgs("email bob@example.com"));
      expect(response.error).toBeNull();
      expect(JSON.stringify(response.data)).toContain("bob@example.com");
      expect(JSON.stringify(response.data)).not.toContain("alice@example.com");
    });
    expect(lastRedactor()).not.toBe(first);
  });

  it.each(["account", "storage"])(
    "clears the previous scope after the %s changes",
    async (change) => {
      const { result, rerender } = renderHook(
        ({ wallet, storage }) => useChatStorage(options(wallet, storage)),
        { initialProps: { wallet: "account-a", storage: database } }
      );
      await act(async () => {
        await result.current.sendMessage(sendArgs("email alice@example.com"));
      });
      const first = lastRedactor();
      rerender({
        wallet: change === "account" ? "account-b" : "account-a",
        storage: change === "storage" ? makeDatabase() : database,
      });
      expect(first.size).toBe(0);
      await act(async () => {
        const response = await result.current.sendMessage(sendArgs());
        expect(JSON.stringify(response.data)).not.toContain("alice@example.com");
      });
      expect(lastRedactor()).not.toBe(first);
    }
  );

  it.each(["logout", "account", "storage"])(
    "does not restore delayed model output after %s",
    async (change) => {
      const gate = deferred<void>();
      vi.mocked(createSseClient).mockReturnValue({
        stream: modelResponse(gate.promise),
      } as ReturnType<typeof createSseClient>);
      const onData = vi.fn();
      const { result, rerender } = renderHook(
        ({ wallet, storage }) => useChatStorage({ ...options(wallet, storage), onData }),
        { initialProps: { wallet: "account-a", storage: database } }
      );
      let pending!: ReturnType<typeof result.current.sendMessage>;
      act(() => {
        pending = result.current.sendMessage(sendArgs("email alice@example.com"));
      });
      await waitFor(() => expect(createSseClient).toHaveBeenCalled());
      const first = lastRedactor();
      if (change === "logout") {
        act(() => clearAllEncryptionState());
      } else {
        rerender({
          wallet: change === "account" ? "account-b" : "account-a",
          storage: change === "storage" ? makeDatabase() : database,
        });
      }
      gate.resolve();
      await act(async () => {
        const response = await pending;
        expect(JSON.stringify(response.data)).not.toContain("alice@example.com");
      });
      expect(onData.mock.calls.flat().join("")).not.toContain("alice@example.com");
      expect(first.size).toBe(0);
    }
  );

  it("does not recreate mappings when NER completes after logout", async () => {
    const gate = deferred<PiiSpan[]>();
    const nerDetector = { detect: vi.fn(() => gate.promise) };
    const { result } = renderHook(() => useChatStorage({ ...options(), nerDetector }));
    let pending!: ReturnType<typeof result.current.sendMessage>;
    act(() => {
      pending = result.current.sendMessage(sendArgs("email alice@example.com"));
    });
    await waitFor(() => expect(nerDetector.detect).toHaveBeenCalled());
    const first = lastRedactor();
    act(() => clearAllEncryptionState());
    gate.resolve([]);
    await act(async () => {
      const response = await pending;
      expect(response.error).toBeTruthy();
      expect(JSON.stringify(response.data)).not.toContain("alice@example.com");
    });
    expect(first.size).toBe(0);
    expect(createSseClient).not.toHaveBeenCalled();
  });
});
