// @vitest-environment happy-dom

import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from "vitest";

import { runToolLoop } from "../lib/chat/toolLoop";
import { type FileMetadata, getMessagesOp } from "../lib/db/chat";
import { getMediaOp } from "../lib/db/media";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../lib/db/schema";
import { writeEncryptedFile } from "../lib/storage";
import { useChatStorage } from "./useChatStorage";
import { clearAllEncryptionKeys, seedEncryptionKeys } from "./useEncryption";

vi.mock("../lib/chat/toolLoop", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/chat/toolLoop")>();
  return { ...original, runToolLoop: vi.fn() };
});

vi.mock("../lib/storage", async (importOriginal) => {
  const original = await importOriginal<typeof import("../lib/storage")>();
  return {
    ...original,
    isOPFSSupported: () => true,
    writeEncryptedFile: vi.fn().mockResolvedValue(undefined),
  };
});

const ADDRESS = "0x1234567890123456789012345678901234567890";
const CONVERSATION_ID = "conv_file_size";
const DEFAULT_LIMIT = 10 * 1024 * 1024;

function attachment(name: string, size: number, type = "text/plain"): FileMetadata {
  return { id: name, name, size, type, url: `data:${type};base64,${btoa(name)}` };
}

describe("useChatStorage attachment storage size limit", () => {
  let database: Database;
  let fetchSpy: MockInstance<typeof fetch>;

  beforeEach(() => {
    vi.clearAllMocks();
    clearAllEncryptionKeys();
    seedEncryptionKeys(ADDRESS, { current: "ab".repeat(32) });
    database = new Database({
      adapter: new LokiJSAdapter({
        schema: sdkSchema,
        migrations: sdkMigrations,
        useWebWorker: false,
        useIncrementalIndexedDB: false,
        dbName: `file-size-test-${Math.random().toString(36).slice(2)}`,
      }),
      modelClasses: sdkModelClasses,
    });
    fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
      if (typeof input === "string" && input.startsWith("data:")) {
        return Promise.resolve(
          new Response("file", { headers: { "Content-Type": "application/octet-stream" } })
        );
      }
      return Promise.reject(new Error("No network access in the test"));
    });
    vi.mocked(runToolLoop).mockResolvedValue({
      data: {
        id: "response-file-size",
        model: "test-model",
        object: "response",
        output: [
          {
            type: "message",
            role: "assistant",
            content: [{ type: "output_text", text: "ok" }],
            status: "completed",
          },
        ],
      },
      error: null,
    });
  });

  afterEach(() => {
    cleanup();
    fetchSpy.mockRestore();
    clearAllEncryptionKeys();
  });

  async function storedMedia() {
    return getMediaOp(
      { database, walletAddress: ADDRESS },
      { walletAddress: ADDRESS, conversationId: CONVERSATION_ID }
    );
  }

  async function storedUserMessage() {
    const messages = await getMessagesOp(
      {
        database,
        messagesCollection: database.get("history"),
        conversationsCollection: database.get("conversations"),
      },
      CONVERSATION_ID
    );
    return messages.find((message) => message.role === "user")!;
  }

  it.each([
    { name: "the default limit", maxFileSizeBytes: undefined, fileProcessors: undefined },
    { name: "a configured limit", maxFileSizeBytes: 32, fileProcessors: undefined },
    { name: "disabled processors", maxFileSizeBytes: 32, fileProcessors: null },
    { name: "an empty processor list", maxFileSizeBytes: 32, fileProcessors: [] },
  ])("stores only files within $name before any storage fetch", async (options) => {
    const limit = options.maxFileSizeBytes ?? DEFAULT_LIMIT;
    const accepted = [attachment("small.txt", limit - 1), attachment("boundary.txt", limit)];
    const rejected = [
      attachment("oversized.txt", limit + 1),
      attachment("oversized.png", limit + 1, "image/png"),
    ];
    const { result } = renderHook(() =>
      useChatStorage({
        database,
        conversationId: CONVERSATION_ID,
        walletAddress: ADDRESS,
        getToken: () => Promise.resolve("token"),
        fileProcessors: options.fileProcessors,
        fileProcessingOptions: { maxFileSizeBytes: options.maxFileSizeBytes },
      })
    );

    await act(async () => {
      const response = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Review these files." }] }],
        model: "test-model",
        files: [...accepted, ...rejected],
      });
      expect(response.error).toBeNull();
    });

    const fetchedUrls = fetchSpy.mock.calls
      .map(([input]) => input)
      .filter((input) => typeof input === "string" && input.startsWith("data:"));
    expect(fetchedUrls).toEqual(accepted.map((file) => file.url));
    expect(vi.mocked(writeEncryptedFile).mock.calls.map((call) => call[3]?.name)).toEqual(
      accepted.map((file) => file.name)
    );
    const media = await storedMedia();
    expect(media.map((file) => file.name).sort()).toEqual(accepted.map((file) => file.name).sort());
    expect((await storedUserMessage()).fileIds?.sort()).toEqual(
      media.map((file) => file.mediaId).sort()
    );
    expect(runToolLoop).toHaveBeenCalledTimes(1);
  });

  it("sends the message without media when every file exceeds a zero limit", async () => {
    const { result } = renderHook(() =>
      useChatStorage({
        database,
        conversationId: CONVERSATION_ID,
        walletAddress: ADDRESS,
        getToken: () => Promise.resolve("token"),
        fileProcessingOptions: { maxFileSizeBytes: 0 },
      })
    );

    await act(async () => {
      const response = await result.current.sendMessage({
        messages: [{ role: "user", content: [{ type: "text", text: "Review this file." }] }],
        model: "test-model",
        files: [attachment("oversized.txt", 1)],
      });
      expect(response.error).toBeNull();
    });

    expect(writeEncryptedFile).not.toHaveBeenCalled();
    expect(
      fetchSpy.mock.calls.some(([input]) => typeof input === "string" && input.startsWith("data:"))
    ).toBe(false);
    expect(await storedMedia()).toEqual([]);
    expect((await storedUserMessage()).fileIds ?? []).toEqual([]);
    expect(runToolLoop).toHaveBeenCalledTimes(1);
  });

  it.each([
    { name: "rejects", maxFileSizeBytes: 3, storedNames: [] },
    { name: "accepts", maxFileSizeBytes: 4, storedNames: ["image", "notes.txt"] },
  ])("$name message attachments by their fetched size", async (options) => {
    const { result } = renderHook(() =>
      useChatStorage({
        database,
        conversationId: CONVERSATION_ID,
        walletAddress: ADDRESS,
        getToken: () => Promise.resolve("token"),
        fileProcessingOptions: { maxFileSizeBytes: options.maxFileSizeBytes },
      })
    );

    await act(async () => {
      const response = await result.current.sendMessage({
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Review these files." },
              { type: "image_url", image_url: { url: "data:image/png;base64,aW1n" } },
              {
                type: "input_file",
                file: { filename: "notes.txt", file_data: "data:text/plain;base64,bm90ZXM=" },
              },
            ],
          },
        ],
        model: "test-model",
      });
      expect(response.error).toBeNull();
    });

    const writtenNames = vi.mocked(writeEncryptedFile).mock.calls.map((call) => call[3]?.name);
    expect(writtenNames.sort()).toEqual(options.storedNames);
    const media = await storedMedia();
    expect(media.map((file) => file.name).sort()).toEqual(options.storedNames);
    expect((await storedUserMessage()).fileIds?.sort() ?? []).toEqual(
      media.map((file) => file.mediaId).sort()
    );
    expect(runToolLoop).toHaveBeenCalledTimes(1);
  });
});
