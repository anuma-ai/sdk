import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { clearAllEncryptionKeys, type SignMessageFn } from "../../../react/useEncryption";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../schema";
import type { VaultMemory } from "./models";
import { createVaultMemoryOp, updateVaultMemoryOp } from "./operations";
import { MAX_SOURCE_CHUNK_IDS_BYTES, serializeSourceChunkIds } from "./sourceChunkIds";

const bytes = (value: string) => new TextEncoder().encode(value).length;
const ids = (n: number, from = 0) =>
  Array.from({ length: n }, (_, i) => `message-${from + i}-${"x".repeat(24)}`);

function vaultCtx() {
  const database = new Database({
    adapter: new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName: `source-chunk-ids-${Math.random().toString(36).slice(2)}`,
    }),
    modelClasses: sdkModelClasses,
  });
  return {
    database,
    vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    walletAddress: "0x1234567890123456789012345678901234567890",
    signMessage: vi.fn(async () => `0x${"a1".repeat(65)}`) as unknown as SignMessageFn,
    userId: "u1",
  };
}

beforeEach(() => clearAllEncryptionKeys());

describe("serializeSourceChunkIds", () => {
  it("keeps every id that fits", () => {
    expect(serializeSourceChunkIds(["a", "b"])).toBe('["a","b"]');
    expect(serializeSourceChunkIds([])).toBe("[]");
  });

  it("drops the oldest ids until the JSON fits, measured in bytes", () => {
    const all = ids(600).map((id) => `${id}é`);
    const kept = JSON.parse(serializeSourceChunkIds(all)) as string[];
    expect(bytes(JSON.stringify(kept))).toBeLessThanOrEqual(MAX_SOURCE_CHUNK_IDS_BYTES);
    expect(bytes(JSON.stringify(all.slice(all.length - kept.length - 1)))).toBeGreaterThan(
      MAX_SOURCE_CHUNK_IDS_BYTES
    );
    expect(kept).toEqual(all.slice(all.length - kept.length));
  });
});

describe("local vault writes", () => {
  it("caps source ids on create and keeps the newest when an observation grows them", async () => {
    const ctx = vaultCtx();
    const created = await createVaultMemoryOp(ctx, {
      content: "Name is Sam",
      sourceChunkIds: ids(600),
    });
    expect(bytes(JSON.stringify(created.sourceChunkIds))).toBeLessThanOrEqual(
      MAX_SOURCE_CHUNK_IDS_BYTES
    );

    const newest = ids(1, 1000);
    const updated = await updateVaultMemoryOp(ctx, created.uniqueId, {
      content: "Name is Sam",
      sourceChunkIds: newest,
      observationSourceIds: newest,
    });

    expect(bytes(JSON.stringify(updated!.sourceChunkIds))).toBeLessThanOrEqual(
      MAX_SOURCE_CHUNK_IDS_BYTES
    );
    expect(updated!.sourceChunkIds!.at(-1)).toBe(newest[0]);
  });
});
