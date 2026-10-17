// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/storage", async (importOriginal) => {
  const orig = await importOriginal<typeof import("../lib/storage")>();
  return {
    ...orig,
    isOPFSSupported: () => true,
    readEncryptedFile: vi.fn((id: string) =>
      Promise.resolve({
        blob:
          id === "img"
            ? new Blob([new Uint8Array([1, 2, 3])], { type: "image/png" })
            : new Blob(["%PDF-1.7"], { type: "application/pdf" }),
      })
    ),
  };
});

import type { StoredMessage } from "../lib/db/chat/types";
import { storedToLlmapiMessage } from "./useChatStorage";

describe("storedToLlmapiMessage OPFS files", () => {
  it("replays a stored image as image_url but never a stored PDF", async () => {
    const stored = {
      uniqueId: "u",
      messageId: 1,
      conversationId: "c",
      role: "user",
      content: "look at these",
      files: [
        { id: "pdf", name: "a.pdf", type: "application/pdf", size: 8 },
        { id: "img", name: "b.png", type: "image/png", size: 3 },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as StoredMessage;

    const [message] = await storedToLlmapiMessage(stored, {} as CryptoKey);
    const imageUrls = (message.content ?? [])
      .filter((p) => p.type === "image_url")
      .map((p) => p.image_url?.url ?? "");
    expect(imageUrls).toHaveLength(1);
    expect(imageUrls[0].startsWith("data:image/png")).toBe(true);
  });
});

describe("storedToLlmapiMessage tool call events", () => {
  const CIPHERTEXT = `enc:v3:${"a1".repeat(40)}`;
  const NOTION_OUTPUT =
    '<untrusted_third_party_data source="notion_search">{"title":"Plan"}</untrusted_third_party_data>';

  const assistant = (toolCallEvents: unknown): StoredMessage =>
    ({
      uniqueId: "a",
      messageId: 2,
      conversationId: "c",
      role: "assistant",
      content: "Here is what I found.",
      toolCallEvents,
      createdAt: new Date(),
      updatedAt: new Date(),
    }) as StoredMessage;

  it("replays decrypted events with their arguments and model-facing output", async () => {
    const messages = await storedToLlmapiMessage(
      assistant([
        { id: "t1", name: "notion_search", arguments: '{"q":"plan"}', output: NOTION_OUTPUT },
        {
          id: "t2",
          name: "AnumaImageMCP-generate_cloud_image",
          arguments: '{"prompt":"cat"}',
          output: JSON.stringify({ url: "https://img.test/cat.png", model: "flux" }),
        },
      ]),
      {} as CryptoKey
    );

    expect(messages[0].tool_calls?.map((c) => c.function?.arguments)).toEqual([
      '{"q":"plan"}',
      '{"prompt":"cat"}',
    ]);
    expect(messages.slice(1, 3).map((m) => m.content?.[0]?.text)).toEqual([
      NOTION_OUTPUT,
      JSON.stringify({ model: "flux" }),
    ]);
    expect(messages[3].content?.[0]?.text).toBe("Here is what I found.");
  });

  it("drops events that are still encrypted and keeps the rest", async () => {
    const messages = await storedToLlmapiMessage(
      assistant([
        { id: "t1", name: "notion_search", arguments: CIPHERTEXT, output: CIPHERTEXT },
        { id: "t2", name: "notion_search", arguments: '{"q":"plan"}', output: NOTION_OUTPUT },
        { id: "t3", name: "notion_search", arguments: '{"q":"x"}', output: CIPHERTEXT },
      ]),
      {} as CryptoKey
    );

    expect(messages.map((m) => m.role)).toEqual(["assistant", "tool", "assistant"]);
    expect(messages[0].tool_calls?.map((c) => c.id)).toEqual(["t2"]);
    expect(messages[1].tool_call_id).toBe("t2");
    expect(JSON.stringify(messages)).not.toContain("enc:v");
  });

  it("replays a plain assistant message when every event is still encrypted", async () => {
    const messages = await storedToLlmapiMessage(
      assistant([{ id: "t1", name: "notion_search", arguments: CIPHERTEXT, output: CIPHERTEXT }]),
      {} as CryptoKey
    );

    expect(messages).toHaveLength(1);
    expect(messages[0].tool_calls).toBeUndefined();
    expect(messages[0].content?.[0]?.text).toBe("Here is what I found.");
    expect(JSON.stringify(messages)).not.toContain("enc:v");
  });

  it("ignores a tool call events column that never decoded to a list", async () => {
    const messages = await storedToLlmapiMessage(assistant(CIPHERTEXT), {} as CryptoKey);

    expect(messages).toHaveLength(1);
    expect(messages[0].tool_calls).toBeUndefined();
  });
});
