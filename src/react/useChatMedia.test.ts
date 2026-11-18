import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMediaBatchOp } from "../lib/db/media";
import { deleteEncryptedFile, extractMCPImageUrls } from "../lib/storage";
import { useChatMedia } from "./useChatMedia";

vi.mock("../lib/db/media", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/db/media")>()),
  createMediaBatchOp: vi.fn(),
}));

vi.mock("../lib/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../lib/storage")>()),
  isOPFSSupported: () => true,
  writeEncryptedFile: vi.fn().mockResolvedValue(undefined),
  deleteEncryptedFile: vi.fn().mockResolvedValue(undefined),
  extractMCPImageUrls: vi.fn(),
}));

vi.mock("./useEncryption", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useEncryption")>()),
  hasEncryptionKey: () => true,
  getEncryptionKey: vi.fn().mockResolvedValue({}),
}));

const address = "0x00000000000000000000000000000000000000c1";
const mediaCtx = { database: {}, walletAddress: address } as unknown as Parameters<
  typeof useChatMedia
>[0]["mediaCtx"];

function render(keepFilesWithoutMediaRows: boolean) {
  return renderHook(() =>
    useChatMedia({ mediaCtx, mcpR2Domain: "media.example", keepFilesWithoutMediaRows })
  ).result.current;
}

const storeUserFile = (media: ReturnType<typeof render>) =>
  media.storeUserFilesInOPFS(
    [{ id: "upload-1", name: "notes.bin", type: "", size: 1, url: "data:;base64,eA==" }],
    address,
    "conversation-1"
  );

const storeGeneratedImage = async (media: ReturnType<typeof render>) =>
  (await media.extractAndStoreEncryptedMCPImages("![image](x)", address, "conversation-1")).fileIds;

describe("useChatMedia when media records cannot be written", () => {
  beforeEach(() => {
    vi.mocked(createMediaBatchOp).mockRejectedValue(new Error("database degraded"));
    vi.mocked(extractMCPImageUrls).mockReturnValue([
      { url: "https://media.example/generated.png", mediaType: "image", model: "image-model" },
    ] as ReturnType<typeof extractMCPImageUrls>);
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response(new Blob(["x"])));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["a user's file", storeUserFile],
    ["a generated image", storeGeneratedImage],
  ])("keeps %s and returns its id for a chat backend", async (_kind, store) => {
    const fileIds = await store(render(true));

    expect(fileIds).toHaveLength(1);
    expect(deleteEncryptedFile).not.toHaveBeenCalled();
  });

  it.each([
    ["a user's file", storeUserFile],
    ["a generated image", storeGeneratedImage],
  ])("deletes %s and returns no id without a chat backend", async (_kind, store) => {
    const fileIds = await store(render(false));

    expect(fileIds).toEqual([]);
    expect(deleteEncryptedFile).toHaveBeenCalledTimes(1);
  });
});
