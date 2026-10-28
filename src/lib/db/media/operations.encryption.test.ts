import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearAllEncryptionKeys } from "../../../react/useEncryption";
import { decryptJsonField, isEncrypted } from "../encryption-utils";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import { Media } from "./models";
import { createMediaOp, updateMediaOp } from "./operations";
import type { MediaOperationsContext, UpdateMediaOptions } from "./types";

const ADDRESS = "0x1234567890123456789012345678901234567890";
const MEDIA_ID = "private-media";
const ORIGINAL = {
  name: "private-photo.png",
  sourceUrl: "https://example.com/private-photo.png",
  metadata: { author: "original author" },
};
const CHANGES = {
  name: "updated-photo.png",
  sourceUrl: "https://example.com/updated-photo.png",
  metadata: { author: "updated author" },
};
const signMessage = vi.fn((message: string) =>
  Promise.resolve(`0x${Buffer.from(message).toString("hex").padStart(130, "0")}`)
);

async function seed(encrypted = true) {
  const database = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `media-encryption-${Math.random()}`,
    }),
    modelClasses: sdkModelClasses,
  });
  const ctx: MediaOperationsContext = {
    database,
    ...(encrypted && { walletAddress: ADDRESS, signMessage }),
  };
  const created = await createMediaOp(ctx, {
    ...ORIGINAL,
    mediaId: MEDIA_ID,
    walletAddress: ADDRESS,
    mimeType: "image/png",
    mediaType: "image",
    size: 42,
    role: "user",
  });
  const row = await database.get<Media>("media").find(created.id);
  return { ctx, row };
}

describe("updateMediaOp field encryption", () => {
  beforeEach(() => {
    clearAllEncryptionKeys();
    signMessage.mockReset();
    signMessage.mockImplementation((message: string) =>
      Promise.resolve(`0x${Buffer.from(message).toString("hex").padStart(130, "0")}`)
    );
  });

  it("encrypts changed fields and returns their decrypted values", async () => {
    const { ctx, row } = await seed();

    const updated = await updateMediaOp(ctx, MEDIA_ID, CHANGES);

    expect(isEncrypted(String(row._getRaw("name")))).toBe(true);
    expect(isEncrypted(String(row._getRaw("source_url")))).toBe(true);
    const metadata = JSON.parse(String(row._getRaw("metadata"))) as string;
    expect(isEncrypted(metadata)).toBe(true);
    expect(await decryptJsonField(metadata, ADDRESS)).toEqual(CHANGES.metadata);
    expect(updated).toMatchObject(CHANGES);
  });

  it.each([
    ["name", "name"],
    ["sourceUrl", "source_url"],
    ["metadata", "metadata"],
  ] as const)("preserves omitted encrypted fields after a %s update", async (field, column) => {
    const { ctx, row } = await seed();
    const before: Record<string, unknown> = { ...row._raw };

    const updated = await updateMediaOp(ctx, MEDIA_ID, { [field]: CHANGES[field] });

    for (const encryptedColumn of ["name", "source_url", "metadata"] as const) {
      if (encryptedColumn !== column) {
        expect(row._getRaw(encryptedColumn)).toBe(before[encryptedColumn]);
      }
    }
    const stored = String(row._getRaw(column));
    expect(isEncrypted(column === "metadata" ? (JSON.parse(stored) as string) : stored)).toBe(true);
    expect(updated).toMatchObject({ [field]: CHANGES[field] });
  });

  it("leaves the record unchanged if encryption fails", async () => {
    const { ctx, row } = await seed();
    const before: Record<string, unknown> = { ...row._raw };
    clearAllEncryptionKeys();
    signMessage.mockRejectedValue(new Error("wallet signature unavailable"));

    await expect(updateMediaOp(ctx, MEDIA_ID, CHANGES)).rejects.toThrow(
      "wallet signature unavailable"
    );

    expect(row._raw).toEqual(before);
  });

  it("preserves encrypted fields after a non-sensitive update", async () => {
    const { ctx, row } = await seed();
    const before: Record<string, unknown> = { ...row._raw };

    const updated = await updateMediaOp(ctx, MEDIA_ID, { messageId: "message-1", duration: 3 });

    for (const column of ["name", "source_url", "metadata"] as const) {
      expect(row._getRaw(column)).toBe(before[column]);
    }
    expect(updated).toMatchObject({ name: ORIGINAL.name, messageId: "message-1", duration: 3 });
  });

  it("preserves plaintext updates without an encryption context", async () => {
    const { ctx, row } = await seed(false);

    const updated = await updateMediaOp(ctx, MEDIA_ID, CHANGES);

    expect(row._getRaw("name")).toBe(CHANGES.name);
    expect(row._getRaw("source_url")).toBe(CHANGES.sourceUrl);
    expect(row._getRaw("metadata")).toBe(JSON.stringify(CHANGES.metadata));
    expect(updated).toMatchObject(CHANGES);
  });

  it.each<UpdateMediaOptions>([{ name: "" }, { sourceUrl: "" }, { metadata: {} }])(
    "preserves explicit empty values: %j",
    async (options) => {
      const { ctx } = await seed();

      expect(await updateMediaOp(ctx, MEDIA_ID, options)).toMatchObject(options);
    }
  );
});
