// @vitest-environment happy-dom
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { describe, expect, it, vi } from "vitest";

import { DatabaseManager, type PlatformStorage } from "./manager";
import { SDK_SCHEMA_VERSION, sdkMigrations, sdkSchema } from "./schema";

/** Map-backed PlatformStorage so tests can seed/inspect the migration markers. */
function makeStorage(): PlatformStorage & { persistent: Map<string, string> } {
  const persistent = new Map<string, string>();
  const session = new Map<string, string>();
  return {
    persistent,
    getItem: (k) => persistent.get(k) ?? null,
    setItem: (k, v) => void persistent.set(k, v),
    removeItem: (k) => void persistent.delete(k),
    getSessionItem: (k) => session.get(k) ?? null,
    setSessionItem: (k, v) => void session.set(k, v),
    deleteDatabase: () => Promise.resolve(),
  };
}

function makeManager(
  overrides: Partial<Parameters<typeof DatabaseManager.prototype.constructor>[0]> = {}
) {
  const storage = makeStorage();
  // Real in-memory Loki adapter per call so `new Database(...)` is valid; the spy
  // records the dbName each build so we can assert build counts per wallet.
  const createAdapter = vi.fn((dbName: string) => {
    return new LokiJSAdapter({
      schema: sdkSchema,
      migrations: sdkMigrations,
      useWebWorker: false,
      useIncrementalIndexedDB: false,
      dbName,
    });
  });
  const manager = new DatabaseManager({
    dbNamePrefix: "anuma",
    createAdapter,
    storage,
    onDestructiveMigration: vi.fn(),
    ...overrides,
  });
  return { manager, createAdapter, storage };
}

const WALLET = "0xAbC0000000000000000000000000000000000001";

describe("DatabaseManager.getDatabase caching", () => {
  it("returns the same instance and builds the adapter once for repeat calls", () => {
    const { manager, createAdapter } = makeManager();
    const a = manager.getDatabase(WALLET);
    const b = manager.getDatabase(WALLET);
    expect(a).toBe(b);
    expect(createAdapter).toHaveBeenCalledTimes(1);
    expect(createAdapter).toHaveBeenCalledWith(
      `anuma-${WALLET}`,
      expect.anything(),
      expect.anything()
    );
  });

  // Regression for client#4821: during sign-up, different components' `walletAddress`
  // memos flip undefined->address independently, so getDatabase interleaves guest and
  // wallet. The wallet instance must survive a transient guest excursion (no rebuild),
  // otherwise the rebuild disposes the live OPFS adapter mid-session.
  it("reuses the wallet instance across a transient guest excursion (no rebuild)", () => {
    const { manager, createAdapter } = makeManager();
    const first = manager.getDatabase(WALLET);
    manager.getDatabase(undefined); // a component briefly renders as guest
    const second = manager.getDatabase(WALLET);
    expect(second).toBe(first);
    // Exactly one build for the wallet + one for guest — NOT a rebuild of the wallet.
    expect(createAdapter).toHaveBeenCalledTimes(2);
    const dbNames = createAdapter.mock.calls.map((c) => c[0]);
    expect(dbNames).toEqual([`anuma-${WALLET}`, "anuma-guest"]);
  });

  it("isolates distinct wallets into distinct instances", () => {
    const { manager, createAdapter } = makeManager();
    const other = "0xDeF0000000000000000000000000000000000002";
    const a = manager.getDatabase(WALLET);
    const b = manager.getDatabase(other);
    expect(a).not.toBe(b);
    expect(createAdapter).toHaveBeenCalledTimes(2);
    // Switching back reuses the first instance (still cached, not disposed).
    expect(manager.getDatabase(WALLET)).toBe(a);
    expect(createAdapter).toHaveBeenCalledTimes(2);
  });

  it("rebuilds after resetDatabase drops the cached instance", async () => {
    const { manager, createAdapter } = makeManager();
    const a = manager.getDatabase(WALLET);
    await manager.resetDatabase();
    const b = manager.getDatabase(WALLET);
    expect(b).not.toBe(a);
    expect(createAdapter).toHaveBeenCalledTimes(2);
  });

  // resetDatabase must clear the wallet entry even when the last lookup was a
  // transient guest render (otherwise a logout would wipe guest and leave the
  // wallet DB cached + stale).
  it("resets the wallet DB even when the last getDatabase was guest", async () => {
    const { manager } = makeManager();
    const wallet = manager.getDatabase(WALLET);
    manager.getDatabase(undefined); // currentWalletAddress now points at guest
    await manager.resetDatabase();
    // Both entries were dropped: the wallet is rebuilt fresh, not the stale one.
    expect(manager.getDatabase(WALLET)).not.toBe(wallet);
  });

  it("still triggers a destructive migration (and does not cache) when the stored schema is too old", () => {
    const onDestructiveMigration = vi.fn();
    const { manager, createAdapter, storage } = makeManager({ onDestructiveMigration });
    storage.persistent.set(`anuma-schema-version-${WALLET}`, "7"); // < DESTRUCTIVE_MIGRATION_VERSION (8)
    expect(() => manager.getDatabase(WALLET)).toThrow(/migration in progress/i);
    expect(createAdapter).not.toHaveBeenCalled();
    // A first-time wallet just records the current version, no migration.
    const fresh = "0x0000000000000000000000000000000000000003";
    expect(() => manager.getDatabase(fresh)).not.toThrow();
    expect(storage.persistent.get(`anuma-schema-version-${fresh}`)).toBe(
      String(SDK_SCHEMA_VERSION)
    );
  });
});
