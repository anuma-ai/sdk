import { describe, it, expect, beforeEach, vi } from "vitest";

// Stub WatermelonDB's Database so we don't spin up a real adapter/worker.
// `database.adapter.underlyingAdapter` mirrors how DatabaseAdapterCompat wraps
// the adapter passed to `new Database(...)`, which is what disposeAdapter probes.
vi.mock("@nozbe/watermelondb", async (importActual) => {
  const actual = await importActual<typeof import("@nozbe/watermelondb")>();
  class MockDatabase {
    adapter: { underlyingAdapter: unknown };
    constructor(opts: { adapter: unknown }) {
      this.adapter = { underlyingAdapter: opts.adapter };
    }
    async write(fn: () => Promise<void>): Promise<void> {
      await fn();
    }
    async unsafeResetDatabase(): Promise<void> {}
  }
  return { ...actual, Database: MockDatabase };
});

import { DatabaseManager, type PlatformStorage } from "./manager";

const WALLET_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const WALLET_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

/** In-memory storage so handleSchemaMigration doesn't touch localStorage. */
function makeStorage(): PlatformStorage {
  const persistent = new Map<string, string>();
  const session = new Map<string, string>();
  return {
    getItem: (k) => persistent.get(k) ?? null,
    setItem: (k, v) => void persistent.set(k, v),
    removeItem: (k) => void persistent.delete(k),
    getSessionItem: (k) => session.get(k) ?? null,
    setSessionItem: (k, v) => void session.set(k, v),
    deleteDatabase: async () => {},
  };
}

interface FakeAdapter {
  dispose?: ReturnType<typeof vi.fn>;
}

describe("DatabaseManager adapter disposal (#4163)", () => {
  let adapters: FakeAdapter[];
  let warn: ReturnType<typeof vi.fn>;

  /** createAdapter factory that records each adapter it hands out. */
  function makeManager(opts?: { dispose?: () => unknown }) {
    adapters = [];
    warn = vi.fn();
    const createAdapter = () => {
      const adapter: FakeAdapter =
        opts && !("dispose" in opts) ? {} : { dispose: vi.fn(opts?.dispose ?? (() => undefined)) };
      adapters.push(adapter);
      // Cast: the SDK only needs the object identity; it probes for dispose().
      return adapter as unknown as never;
    };
    return new DatabaseManager({
      dbNamePrefix: "test-db",
      createAdapter,
      storage: makeStorage(),
      logger: { warn },
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("disposes the previous adapter on wallet switch, not the new one", () => {
    const mgr = makeManager();
    mgr.getDatabase(WALLET_A);
    mgr.getDatabase(WALLET_B);

    expect(adapters).toHaveLength(2);
    expect(adapters[0].dispose).toHaveBeenCalledTimes(1);
    expect(adapters[1].dispose).not.toHaveBeenCalled();
  });

  it("does not dispose or recreate when the wallet is unchanged", () => {
    const mgr = makeManager();
    const first = mgr.getDatabase(WALLET_A);
    const second = mgr.getDatabase(WALLET_A);

    expect(first).toBe(second);
    expect(adapters).toHaveLength(1);
    expect(adapters[0].dispose).not.toHaveBeenCalled();
  });

  it("disposes the current adapter on resetDatabase", async () => {
    const mgr = makeManager();
    mgr.getDatabase(WALLET_A);
    await mgr.resetDatabase();

    expect(adapters[0].dispose).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the adapter has no dispose method", () => {
    // opts present without a "dispose" key => factory yields adapters lacking dispose
    const mgr = makeManager({});
    expect(() => {
      mgr.getDatabase(WALLET_A);
      mgr.getDatabase(WALLET_B);
    }).not.toThrow();
    expect(adapters[0].dispose).toBeUndefined();
  });

  it("swallows an async dispose rejection and logs a warning", async () => {
    const mgr = makeManager({ dispose: () => Promise.reject(new Error("boom")) });
    mgr.getDatabase(WALLET_A);
    // Wallet switch triggers fire-and-forget dispose of A.
    expect(() => mgr.getDatabase(WALLET_B)).not.toThrow();

    // Let the rejected promise's .catch run.
    await Promise.resolve();
    await Promise.resolve();

    expect(warn).toHaveBeenCalledWith(
      "Adapter dispose failed",
      expect.objectContaining({ component: "DatabaseManager" })
    );
  });
});
