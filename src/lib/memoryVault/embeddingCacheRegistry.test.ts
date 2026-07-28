/**
 * @vitest-environment happy-dom
 *
 * The registry's whole job is identity: which callers get the same warm cache
 * and which must not. Sharing is a latency win; isolation is a correctness
 * requirement, because the cache is keyed by memory id with no model or wallet
 * discriminator inside it — the read path validates a hit by *dimension* only
 * (`searchTool.ts`), so a wrongly-shared instance is silently wrong rather than
 * loudly broken.
 */
import type { Database } from "@nozbe/watermelondb";
import { beforeEach, describe, expect, it } from "vitest";

import { clearAllEncryptionState } from "../../react/useEncryption";
import {
  __resetVaultEmbeddingCacheRegistryForTests,
  getVaultEmbeddingCache,
} from "./embeddingCacheRegistry";

const MODEL = "text-embedding-3-small";
const OTHER_MODEL = "text-embedding-3-large";
const WALLET = "0xAAA";
const OTHER_WALLET = "0xBBB";

/**
 * The registry only ever uses the database as a `WeakMap` key — it never
 * dereferences it — so an opaque object is a faithful stand-in and keeps this
 * suite free of an adapter.
 */
function fakeDatabase(): Database {
  return {} as unknown as Database;
}

describe("vault embedding cache registry", () => {
  let db: Database;

  beforeEach(() => {
    // `vi.resetModules()` doesn't re-initialize already-resolved module
    // bindings, so reset the registry explicitly for per-test isolation.
    __resetVaultEmbeddingCacheRegistryForTests();
    db = fakeDatabase();
  });

  it("hands the same instance to every caller with the same database, wallet and model", () => {
    const first = getVaultEmbeddingCache(db, WALLET, MODEL);
    const second = getVaultEmbeddingCache(db, WALLET, MODEL);

    expect(second).toBe(first);
    // Sharing means sharing contents — that is the point of the warm.
    first.set("mem_1", Float32Array.from([0.1, 0.2]));
    expect(second.get("mem_1")).toEqual(Float32Array.from([0.1, 0.2]));
  });

  it("gives a different wallet its own instance", () => {
    const mine = getVaultEmbeddingCache(db, WALLET, MODEL);
    mine.set("mem_1", Float32Array.from([0.1, 0.2]));

    const theirs = getVaultEmbeddingCache(db, OTHER_WALLET, MODEL);

    expect(theirs).not.toBe(mine);
    // Vectors are derived from wallet-decrypted content: the next account must
    // not be able to read the previous one's, even on a shared database.
    expect(theirs.has("mem_1")).toBe(false);
  });

  it("gives a different embedding model its own instance", () => {
    const small = getVaultEmbeddingCache(db, WALLET, MODEL);
    small.set("mem_1", Float32Array.from([0.1, 0.2]));

    const large = getVaultEmbeddingCache(db, WALLET, OTHER_MODEL);

    expect(large).not.toBe(small);
    // Entries carry no model tag, so a shared instance would feed one model's
    // vectors into another model's cosine math whenever the dimensions match.
    expect(large.has("mem_1")).toBe(false);
  });

  it("gives a different database its own instance", () => {
    const first = getVaultEmbeddingCache(db, WALLET, MODEL);
    const second = getVaultEmbeddingCache(fakeDatabase(), WALLET, MODEL);

    // Entries are keyed by memory id, and ids are only unique within a database.
    expect(second).not.toBe(first);
  });

  it("keys a wallet-less caller consistently, and apart from any real wallet", () => {
    const anonymous = getVaultEmbeddingCache(db, undefined, MODEL);

    expect(getVaultEmbeddingCache(db, undefined, MODEL)).toBe(anonymous);
    expect(getVaultEmbeddingCache(db, WALLET, MODEL)).not.toBe(anonymous);
  });

  it("keeps the wallet and model halves of the key distinct", () => {
    // The key is a single string, so a caller must not be able to shift the
    // boundary between its two components and land on another identity's
    // cache. `walletAddress` is typed as an opaque string — the "it's always
    // hex" assumption is not one this can afford to make.
    const a = getVaultEmbeddingCache(db, "0xAA", `BB|${MODEL}`);
    const b = getVaultEmbeddingCache(db, "0xAA|BB", MODEL);
    const c = getVaultEmbeddingCache(db, `0xAA","BB`, MODEL);

    expect(b).not.toBe(a);
    expect(c).not.toBe(a);
    expect(c).not.toBe(b);
  });

  it("stops resolving pre-teardown instances after encryption state is cleared", () => {
    const before = getVaultEmbeddingCache(db, WALLET, MODEL);
    before.set("mem_1", Float32Array.from([0.1, 0.2]));

    clearAllEncryptionState();

    const after = getVaultEmbeddingCache(db, WALLET, MODEL);
    // A cache no mounted hook still references would otherwise stay warm with
    // the previous session's vectors and be handed to whoever mounts next.
    expect(after).not.toBe(before);
    expect(after.size).toBe(0);
  });
});
