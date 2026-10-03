// @vitest-environment happy-dom
/**
 * History replay of files stored in OPFS: only images may go out as `image_url`. A stored PDF or
 * text attachment used to be replayed as `data:application/pdf;…` in an image part, which the
 * backend rejects (image_unscannable_blocked) for the whole turn.
 */

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
