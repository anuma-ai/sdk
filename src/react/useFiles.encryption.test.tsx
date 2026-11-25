import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

import { isEncrypted } from "../lib/db/encryption-utils";
import { createMediaOp, type Media } from "../lib/db/media";
import { sdkModelClasses, sdkSchema } from "../lib/db/schema";
import { clearAllEncryptionKeys } from "./useEncryption";
import { useFiles } from "./useFiles";

const walletAddress = "0x1234567890123456789012345678901234567890";
const changes = {
  name: "updated.png",
  sourceUrl: "https://example.com/updated.png",
  metadata: { author: "updated author" },
};

afterEach(clearAllEncryptionKeys);

function sign() {
  return Promise.resolve(`0x${"ab".repeat(65)}`);
}

async function seedEncryptedMedia() {
  const database = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `use-files-encryption-${Math.random()}`,
    }),
    modelClasses: sdkModelClasses,
  });
  const signMessage = vi.fn(sign);
  const media = await createMediaOp(
    { database, walletAddress, signMessage },
    {
      walletAddress,
      name: "original.png",
      sourceUrl: "https://example.com/original.png",
      metadata: { author: "original author" },
      mimeType: "image/png",
      mediaType: "image",
      size: 42,
      role: "user",
    }
  );
  const row = await database.get<Media>("media").find(media.id);
  expect(isEncrypted(row.name)).toBe(true);
  clearAllEncryptionKeys();
  signMessage.mockClear();
  return { database, media, row, signMessage };
}

it.each(["standard", "embedded"])(
  "encrypts updates through useFiles with the %s signer",
  async (wallet) => {
    const { database, media, row, signMessage } = await seedEncryptedMedia();
    const embeddedWalletSigner = wallet === "embedded" ? vi.fn(sign) : undefined;
    const options = { database, walletAddress, signMessage, embeddedWalletSigner };
    const { result } = renderHook(() => useFiles(options));
    await waitFor(() => expect(result.current.isReady).toBe(true));

    const updated = await result.current.updateMedia(media.mediaId, changes);

    expect(isEncrypted(row.name)).toBe(true);
    expect(isEncrypted(String(row.sourceUrl))).toBe(true);
    const metadata: unknown = JSON.parse(String(row._getRaw("metadata")));
    expect(typeof metadata === "string" && isEncrypted(metadata)).toBe(true);
    expect(updated).toMatchObject(changes);
    expect(embeddedWalletSigner ?? signMessage).toHaveBeenCalled();
  }
);

it("preserves encrypted fields when useFiles has no signer", async () => {
  const { database, media, row } = await seedEncryptedMedia();
  const before = { ...row._raw };
  const { result } = renderHook(() => useFiles({ database, walletAddress }));
  await waitFor(() => expect(result.current.isReady).toBe(true));

  await expect(result.current.updateMedia(media.mediaId, changes)).rejects.toThrow(
    "Provide the wallet address and signer to update encrypted media fields."
  );
  expect(row._raw).toEqual(before);
});
