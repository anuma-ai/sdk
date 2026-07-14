/**
 * ADVERSARIAL QA — NOT part of the PR2 dev's test matrix.
 * Sweep-amplification, cross-user scoping, concurrency, and a 100-row mixed
 * matrix that asserts the EXACT expected subset transitions (not just counts).
 *
 * Uncommitted scratch file — do not ship.
 */
import { Database } from "@nozbe/watermelondb";
import LokiJSAdapter from "@nozbe/watermelondb/adapters/lokijs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const encMocks = vi.hoisted(() => ({
  encrypt: vi.fn(async (content: string) => `enc:${content}`),
  decrypt: vi.fn(async (m: { content: string }) => ({
    ...m,
    content: String(m.content).replace(/^enc:/, ""),
  })),
}));

vi.mock("../db/memoryVault/encryption", () => ({
  encryptVaultMemoryContent: encMocks.encrypt,
  decryptVaultMemoryFields: encMocks.decrypt,
}));

import type { FactType } from "./autoExtract";

import type { VaultMemory } from "../db/memoryVault/models";
import {
  archiveVaultMemoryOp,
  createVaultMemoryOp,
  getDecayCandidatesRawOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";

import { HARD_DELETE_WINDOW_MS, MEDIUM_TTL_MS, PAST_EVENT_GRACE_MS, SHORT_TTL_MS } from "./decay";
import { createDecaySweeper } from "./decayWorker";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 1);

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `decay-qa-test-${Math.random().toString(36).slice(2)}`,
  });
  return new Database({ adapter, modelClasses: sdkModelClasses });
}

let database: Database;
let vaultCtx: VaultMemoryOperationsContext;

beforeEach(() => {
  encMocks.encrypt.mockClear();
  encMocks.decrypt.mockClear();
  database = makeDatabase();
  vaultCtx = {
    database,
    vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    walletAddress: "0xtest",
    signMessage: async (_message: string) => "0xsig",
  };
});

interface SeedOptions {
  content: string;
  factType?: FactType;
  source?: string;
  trustTier?: string;
  eventTime?: {
    start: number | null;
    end: number | null;
    kind: "point" | "range" | "ongoing" | null;
  };
  updatedAt?: number;
  archivedAt?: number;
}

async function seedInto(ctx: VaultMemoryOperationsContext, opts: SeedOptions): Promise<string> {
  const created = await createVaultMemoryOp(ctx, {
    content: opts.content,
    source: opts.source ?? "auto-extracted",
    ...(opts.factType !== undefined && { factType: opts.factType }),
    ...(opts.trustTier !== undefined && { trustTier: opts.trustTier }),
    ...(opts.eventTime !== undefined && { eventTime: opts.eventTime }),
  });
  const id = created.uniqueId;
  if (opts.updatedAt !== undefined || opts.archivedAt !== undefined) {
    const rec = await ctx.vaultMemoryCollection.find(id);
    await database.write(async () => {
      await rec.update((r) => {
        if (opts.updatedAt !== undefined) r._setRaw("updated_at", opts.updatedAt);
        if (opts.archivedAt !== undefined) r._setRaw("archived_at", opts.archivedAt);
      });
    });
  }
  return id;
}

describe("QA: cross-user scoping — no cross-wallet/cross-user decay amplification", () => {
  it("a sweep scoped to user A does not touch user B's rows, even though both live in the same collection", async () => {
    const ctxA: VaultMemoryOperationsContext = { ...vaultCtx, userId: "user-a" };
    const ctxB: VaultMemoryOperationsContext = { ...vaultCtx, userId: "user-b" };

    const staleA = await seedInto(ctxA, {
      content: "A stale",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + DAY),
    });
    const staleB = await seedInto(ctxB, {
      content: "B stale",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + DAY),
    });

    const result = await createDecaySweeper({ vaultCtx: ctxA, now: NOW }).runSweep();
    expect(result).toEqual({ archived: 1, deleted: 0, scanned: 1 });

    const candidatesUnscoped = await getDecayCandidatesRawOp(vaultCtx);
    const aRow = candidatesUnscoped.find((c) => c.uniqueId === staleA)!;
    const bRow = candidatesUnscoped.find((c) => c.uniqueId === staleB)!;
    expect(aRow.archivedAt).toBe(NOW); // archived
    expect(bRow.archivedAt).toBeNull(); // untouched — no cross-user amplification
  });

  it("BUG-WATCH: a sweep run WITHOUT userId scoping (ctx.userId undefined) sees and decays every user's rows in a shared multi-tenant DB", async () => {
    // This is not new to PR2 (baseVaultConditions is shared), but PR2's
    // getDecayCandidatesRawOp inherits it directly, so an unscoped context
    // (e.g. a server misconfiguration that forgets to pass userId) IS a
    // sweep-amplification vector across an entire multi-tenant table.
    const ctxA: VaultMemoryOperationsContext = { ...vaultCtx, userId: "user-a" };
    const ctxB: VaultMemoryOperationsContext = { ...vaultCtx, userId: "user-b" };
    await seedInto(ctxA, {
      content: "A stale",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + DAY),
    });
    await seedInto(ctxB, {
      content: "B stale",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + DAY),
    });

    // vaultCtx (module-level) has no userId — simulates a misconfigured caller.
    const result = await createDecaySweeper({ vaultCtx, now: NOW }).runSweep();
    expect(result.scanned).toBe(2);
    expect(result.archived).toBe(2); // both users' rows archived in one sweep
  });
});

describe("QA: 100-row mixed matrix — exact subset transitions", () => {
  it("archives/deletes exactly the expected subset out of 100 rows spanning every type/source/state combination", async () => {
    const expectArchive = new Set<string>();
    const expectDelete = new Set<string>();
    const expectKeep = new Set<string>();

    const NEVER_TYPES: FactType[] = ["identity", "preference", "relationship", "constraint"];
    const SHORT_TYPES: FactType[] = ["plan", "ongoing_context"];

    // 40 durable-type rows, half ancient — none should ever move.
    for (let i = 0; i < 40; i++) {
      const type = NEVER_TYPES[i % NEVER_TYPES.length];
      const ancient = i % 2 === 0;
      const id = await seedInto(vaultCtx, {
        content: `durable-${i}`,
        factType: type,
        updatedAt: ancient ? NOW - 5 * 365 * DAY : NOW - DAY,
      });
      expectKeep.add(id);
    }

    // 20 short-type rows: 10 aged past SHORT_TTL (archive), 10 fresh (keep).
    for (let i = 0; i < 20; i++) {
      const type = SHORT_TYPES[i % SHORT_TYPES.length];
      const aged = i < 10;
      const id = await seedInto(vaultCtx, {
        content: `short-${i}`,
        factType: type,
        updatedAt: aged ? NOW - (SHORT_TTL_MS + DAY) : NOW - DAY,
      });
      if (aged) expectArchive.add(id);
      else expectKeep.add(id);
    }

    // 10 "other"/null rows aged past MEDIUM_TTL → archive.
    for (let i = 0; i < 10; i++) {
      const id = await seedInto(vaultCtx, {
        content: `medium-${i}`,
        factType: i % 2 === 0 ? "other" : undefined,
        updatedAt: NOW - (MEDIUM_TTL_MS + DAY),
      });
      expectArchive.add(id);
    }

    // 10 already-archived rows past the hard-delete window → delete.
    for (let i = 0; i < 10; i++) {
      const id = await seedInto(vaultCtx, {
        content: `old-archived-${i}`,
        factType: "other",
        archivedAt: NOW - (HARD_DELETE_WINDOW_MS + DAY),
      });
      expectDelete.add(id);
    }

    // 10 already-archived rows still inside the window → keep (as archived).
    for (let i = 0; i < 10; i++) {
      const id = await seedInto(vaultCtx, {
        content: `recent-archived-${i}`,
        factType: "other",
        archivedAt: NOW - (HARD_DELETE_WINDOW_MS - DAY),
      });
      expectKeep.add(id);
    }

    // 5 manual rows, ancient but NOT archived — protected from auto-archive, so
    // they must never move (the manual escape hatch for AUTO-ARCHIVE).
    for (let i = 0; i < 5; i++) {
      const id = await seedInto(vaultCtx, {
        content: `manual-ancient-${i}`,
        factType: "other",
        source: "manual",
        updatedAt: NOW - 10 * 365 * DAY,
      });
      expectKeep.add(id);
    }
    // 5 manual rows that ARE archived past the hard-delete window — per the
    // product decision, the purge clock applies to all archived rows, so these
    // ARE hard-deleted despite source=manual.
    for (let i = 0; i < 5; i++) {
      const id = await seedInto(vaultCtx, {
        content: `manual-archived-past-window-${i}`,
        factType: "other",
        source: "manual",
        archivedAt: NOW - (HARD_DELETE_WINDOW_MS + 365 * DAY),
      });
      expectDelete.add(id);
    }

    expect(expectKeep.size + expectArchive.size + expectDelete.size).toBe(100);

    const result = await createDecaySweeper({ vaultCtx, now: NOW }).runSweep();
    expect(result.scanned).toBe(100);
    expect(result.archived).toBe(expectArchive.size);
    expect(result.deleted).toBe(expectDelete.size);

    // Verify EXACT membership, not just counts.
    const postCandidates = await getDecayCandidatesRawOp(vaultCtx);
    const stillPresent = new Set(postCandidates.map((c) => c.uniqueId));

    for (const id of expectDelete) {
      expect(stillPresent.has(id)).toBe(false); // hard-deleted, gone even from the archived view
    }
    for (const id of expectArchive) {
      const row = postCandidates.find((c) => c.uniqueId === id);
      expect(row).toBeDefined();
      expect(row!.archivedAt).toBe(NOW); // freshly archived this sweep
    }
    for (const id of expectKeep) {
      expect(stillPresent.has(id)).toBe(true);
    }
  });
});

describe("QA: quarantined rows are still decay candidates (excluded from recall, not from decay)", () => {
  it("an old quarantined 'other' row still ages out via the sweep", async () => {
    const id = await seedInto(vaultCtx, {
      content: "quarantined stale",
      factType: "other",
      trustTier: "quarantined",
      updatedAt: NOW - (MEDIUM_TTL_MS + DAY),
    });
    const result = await createDecaySweeper({ vaultCtx, now: NOW }).runSweep();
    expect(result.archived).toBe(1);
    const candidates = await getDecayCandidatesRawOp(vaultCtx);
    expect(candidates.find((c) => c.uniqueId === id)?.archivedAt).toBe(NOW);
  });
});

describe("QA: concurrent sweeps over the same vault (simulated multi-tab race)", () => {
  it("two concurrent runSweep() calls over the same candidates never double-count or corrupt state", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 10; i++) {
      ids.push(
        await seedInto(vaultCtx, {
          content: `race-${i}`,
          factType: "other",
          updatedAt: NOW - (MEDIUM_TTL_MS + DAY),
        })
      );
    }

    const sweeperTab1 = createDecaySweeper({ vaultCtx, now: NOW });
    const sweeperTab2 = createDecaySweeper({ vaultCtx, now: NOW });

    // Fire both sweeps without awaiting between them — both will scan the
    // same pre-mutation candidate set (classic multi-tab race window).
    const [r1, r2] = await Promise.all([sweeperTab1.runSweep(), sweeperTab2.runSweep()]);

    // Total successful archive writes across both sweepers must equal
    // exactly the number of rows (each archived exactly once) — no row
    // silently lost, no row double-counted.
    expect(r1.archived + r2.archived).toBe(10);

    const candidates = await getDecayCandidatesRawOp(vaultCtx);
    for (const id of ids) {
      expect(candidates.find((c) => c.uniqueId === id)?.archivedAt).toBe(NOW);
    }
    // No row's archivedAt should reflect a "double write" artifact — a
    // second `_setRaw("archived_at", ...)` on an already-archived row would
    // still just write the same NOW value, so this specific race is benign
    // by construction (idempotent), but the assertion pins that guarantee.
  });

  it("archiveVaultMemoryOp called twice concurrently for the SAME row: exactly one succeeds", async () => {
    const id = await seedInto(vaultCtx, {
      content: "single row race",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + DAY),
    });
    const [ok1, ok2] = await Promise.all([
      archiveVaultMemoryOp(vaultCtx, id, { now: NOW }),
      archiveVaultMemoryOp(vaultCtx, id, { now: NOW + 1 }),
    ]);
    // Exactly one of the two concurrent calls wins (WatermelonDB serializes
    // database.write() internally), the other observes archivedAt !== null
    // and reports false — no exception, no corrupted archived_at.
    expect([ok1, ok2].filter(Boolean).length).toBe(1);
  });
});

describe("QA: idempotency — archived-this-sweep row is not deleted in the SAME sweep", () => {
  it("a row that crosses active->archived in this sweep is not also evaluated for archived->delete in the same pass", async () => {
    // Seed a row aged enough to archive AND (if its archivedAt were somehow
    // already past the hard-delete window) to also qualify for delete — but
    // since it starts ACTIVE (archivedAt null), only the archive transition
    // can apply this sweep; classification happens once, before any writes,
    // off the pre-mutation snapshot.
    const id = await seedInto(vaultCtx, {
      content: "freshly aged",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + DAY),
    });
    const result = await createDecaySweeper({ vaultCtx, now: NOW }).runSweep();
    expect(result).toEqual({ archived: 1, deleted: 0, scanned: 1 });
    const candidates = await getDecayCandidatesRawOp(vaultCtx);
    const row = candidates.find((c) => c.uniqueId === id)!;
    expect(row.archivedAt).toBe(NOW); // archived, not deleted, in this same pass
  });

  it("archived_at is set exactly once and does not get bumped by a later no-op sweep", async () => {
    const id = await seedInto(vaultCtx, {
      content: "aged fact",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + DAY),
    });
    const sweeper = createDecaySweeper({ vaultCtx, now: NOW });
    await sweeper.runSweep();
    const firstArchivedAt = (await getDecayCandidatesRawOp(vaultCtx)).find(
      (c) => c.uniqueId === id
    )!.archivedAt;
    expect(firstArchivedAt).toBe(NOW);

    // Run again with an ADVANCED clock, but still inside the hard-delete
    // window — archived_at must not be bumped to the new `now`.
    const laterSweeper = createDecaySweeper({ vaultCtx, now: NOW + DAY });
    const second = await laterSweeper.runSweep();
    expect(second).toEqual({ archived: 0, deleted: 0, scanned: 1 });
    const secondArchivedAt = (await getDecayCandidatesRawOp(vaultCtx)).find(
      (c) => c.uniqueId === id
    )!.archivedAt;
    expect(secondArchivedAt).toBe(NOW); // unchanged, not bumped to NOW + DAY
  });
});
