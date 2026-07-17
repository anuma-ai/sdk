/**
 * Decay sweeper tests against a REAL in-memory WatermelonDB (LokiJS adapter —
 * same harness as roundTrip.test.ts). Only the field-encryption edge is
 * mocked (identity passthrough) so we can (a) run with a wallet-bearing context
 * and (b) assert the sweep path NEVER decrypts content — the zero-knowledge
 * guarantee.
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
  getAllVaultMemoriesOp,
  getDecayCandidatesRawOp,
  getVaultMemoryOp,
  hardDeleteDecayedOp,
  restoreVaultMemoryOp,
  updateVaultMemoryOp,
  type VaultMemoryOperationsContext,
} from "../db/memoryVault/operations";
import { sdkMigrations, sdkModelClasses, sdkSchema } from "../db/schema";

import {
  type DecayInput,
  type DecayVerdict,
  HARD_DELETE_WINDOW_MS,
  MEDIUM_TTL_MS,
  PAST_EVENT_GRACE_MS,
} from "./decay";
import { createDecaySweeper } from "./decayWorker";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 1); // 2026-07-01

function makeDatabase(): Database {
  const adapter = new LokiJSAdapter({
    schema: sdkSchema,
    migrations: sdkMigrations,
    useWebWorker: false,
    useIncrementalIndexedDB: false,
    dbName: `decay-worker-test-${Math.random().toString(36).slice(2)}`,
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
    // Per-wallet, physically single-tenant client DB — the sweep scope guard
    // now requires this explicit flag (or a userId) rather than trusting
    // walletAddress alone.
    singleTenant: true,
  };
});

interface SeedOptions {
  content: string;
  factType?: FactType;
  source?: string;
  eventTime?: {
    start: number | null;
    end: number | null;
    kind: "point" | "range" | "ongoing" | null;
  };
  /** Override the auto-stamped updated_at (Unix ms) to age the row. */
  updatedAt?: number;
  /** Pre-set archived_at (Unix ms) to seed an already-archived row. */
  archivedAt?: number;
}

/** Seed one row, defaulting source to "auto-extracted" (decay-eligible). */
async function seed(opts: SeedOptions): Promise<string> {
  const created = await createVaultMemoryOp(vaultCtx, {
    content: opts.content,
    source: opts.source ?? "auto-extracted",
    ...(opts.factType !== undefined && { factType: opts.factType }),
    ...(opts.eventTime !== undefined && { eventTime: opts.eventTime }),
  });
  const id = created.uniqueId;
  if (opts.updatedAt !== undefined || opts.archivedAt !== undefined) {
    const rec = await vaultCtx.vaultMemoryCollection.find(id);
    await database.write(async () => {
      await rec.update((r) => {
        if (opts.updatedAt !== undefined) r._setRaw("updated_at", opts.updatedAt);
        if (opts.archivedAt !== undefined) r._setRaw("archived_at", opts.archivedAt);
      });
    });
  }
  return id;
}

/** Read the raw archived_at for an id (via the candidate scan). */
async function archivedAtOf(id: string): Promise<number | null> {
  const candidates = await getDecayCandidatesRawOp(vaultCtx);
  return candidates.find((c) => c.uniqueId === id)?.archivedAt ?? null;
}

describe("createDecaySweeper.runSweep — archive selection", () => {
  it("archives aged auto-extracted rows; keeps durable, fresh, and manual", async () => {
    const agedOther = await seed({
      content: "aged other fact",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + 20 * DAY),
    });
    const agedIdentity = await seed({
      content: "durable identity fact",
      factType: "identity",
      updatedAt: NOW - 5 * 365 * DAY,
    });
    const freshOther = await seed({
      content: "fresh other fact",
      factType: "other",
      updatedAt: NOW - DAY,
    });
    const agedManual = await seed({
      content: "aged manual fact",
      factType: "other",
      source: "manual",
      updatedAt: NOW - 5 * 365 * DAY,
    });

    const swept = vi.fn();
    const sweeper = createDecaySweeper({ vaultCtx, now: NOW, onSwept: swept });
    const result = await sweeper.runSweep();

    expect(result).toEqual({ archived: 1, deleted: 0, scanned: 4 });
    expect(swept).toHaveBeenCalledWith({ archived: 1, deleted: 0, scanned: 4 });

    expect(await archivedAtOf(agedOther)).toBe(NOW);
    expect(await archivedAtOf(agedIdentity)).toBeNull();
    expect(await archivedAtOf(freshOther)).toBeNull();
    expect(await archivedAtOf(agedManual)).toBeNull();

    // The archived row drops out of the default recall lane; the rest stay.
    const active = await getAllVaultMemoriesOp(vaultCtx);
    expect(active.map((m) => m.uniqueId).sort()).toEqual(
      [agedIdentity, freshOther, agedManual].sort()
    );
  });

  it("archives a plan whose event ended past the grace window; keeps a future plan", async () => {
    const pastPlan = await seed({
      content: "trip that already ended",
      factType: "plan",
      updatedAt: NOW, // fresh — only the event-past rule can archive it
      eventTime: {
        start: NOW - (PAST_EVENT_GRACE_MS + 10 * DAY),
        end: NOW - (PAST_EVENT_GRACE_MS + DAY),
        kind: "range",
      },
    });
    const futurePlan = await seed({
      content: "trip next month",
      factType: "plan",
      updatedAt: NOW,
      eventTime: { start: NOW + 20 * DAY, end: NOW + 25 * DAY, kind: "range" },
    });

    const result = await createDecaySweeper({ vaultCtx, now: NOW }).runSweep();

    expect(result.archived).toBe(1);
    expect(await archivedAtOf(pastPlan)).toBe(NOW);
    expect(await archivedAtOf(futurePlan)).toBeNull();
  });
});

describe("createDecaySweeper.runSweep — hard-delete transition", () => {
  it("hard-deletes archived rows past the window; keeps ones still inside", async () => {
    const oldArchived = await seed({
      content: "long-archived fact",
      factType: "other",
      archivedAt: NOW - (HARD_DELETE_WINDOW_MS + 10 * DAY),
    });
    const recentArchived = await seed({
      content: "recently archived fact",
      factType: "other",
      archivedAt: NOW - (HARD_DELETE_WINDOW_MS - 10 * DAY),
    });

    const result = await createDecaySweeper({ vaultCtx, now: NOW }).runSweep();

    expect(result.deleted).toBe(1);
    expect(result.archived).toBe(0);

    // Hard-deleted → gone even from the archived view.
    expect(await getVaultMemoryOp(vaultCtx, oldArchived)).toBeNull();
    expect(await archivedAtOf(oldArchived)).toBeNull(); // excluded (is_deleted)
    // Still archived, still present.
    expect(await archivedAtOf(recentArchived)).not.toBeNull();
  });
});

describe("createDecaySweeper.runSweep — idempotency", () => {
  it("does not re-archive on a second run with the same clock", async () => {
    await seed({
      content: "aged fact",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + 20 * DAY),
    });

    const sweeper = createDecaySweeper({ vaultCtx, now: NOW });
    const first = await sweeper.runSweep();
    const second = await sweeper.runSweep();

    expect(first).toEqual({ archived: 1, deleted: 0, scanned: 1 });
    // Now archived (stamped at NOW), inside the delete window → no transition.
    expect(second).toEqual({ archived: 0, deleted: 0, scanned: 1 });
  });

  it("returns zero counts and no-ops after dispose", async () => {
    await seed({
      content: "aged fact",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + 20 * DAY),
    });
    const sweeper = createDecaySweeper({ vaultCtx, now: NOW });
    sweeper.dispose();
    const result = await sweeper.runSweep();
    expect(result).toEqual({ archived: 0, deleted: 0, scanned: 0 });
  });
});

describe("archiveVaultMemoryOp — concurrent-retain stale re-check", () => {
  it("does not archive when the row was re-observed (updated_at changed) after the scan", async () => {
    const id = await seed({
      content: "aged fact that gets re-observed",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + 20 * DAY),
    });

    // Sweep observed this stale updated_at.
    const staleUpdatedAt = (await getDecayCandidatesRawOp(vaultCtx)).find(
      (c) => c.uniqueId === id
    )!.updatedAt;

    // A retain() merge lands: bump updated_at (simulating re-observation).
    const rec = await vaultCtx.vaultMemoryCollection.find(id);
    await database.write(async () => {
      await rec.update((r) => r._setRaw("updated_at", NOW));
    });

    // The archive guarded on the stale updated_at must skip — the fact is fresh.
    const ok = await archiveVaultMemoryOp(vaultCtx, id, {
      now: NOW,
      expectedUpdatedAt: staleUpdatedAt,
    });
    expect(ok).toBe(false);
    expect(await archivedAtOf(id)).toBeNull();
  });

  it("archives when the guard matches (no concurrent write)", async () => {
    const id = await seed({
      content: "aged fact",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + 20 * DAY),
    });
    const updatedAt = (await getDecayCandidatesRawOp(vaultCtx)).find(
      (c) => c.uniqueId === id
    )!.updatedAt;
    const ok = await archiveVaultMemoryOp(vaultCtx, id, { now: NOW, expectedUpdatedAt: updatedAt });
    expect(ok).toBe(true);
    expect(await archivedAtOf(id)).toBe(NOW);
  });

  it("is idempotent — a second archive of an already-archived row returns false", async () => {
    const id = await seed({ content: "fact", factType: "other" });
    expect(await archiveVaultMemoryOp(vaultCtx, id, { now: NOW })).toBe(true);
    expect(await archiveVaultMemoryOp(vaultCtx, id, { now: NOW + DAY })).toBe(false);
    // The original archived_at is preserved (not clobbered by the second call).
    expect(await archivedAtOf(id)).toBe(NOW);
  });
});

describe("hardDeleteDecayedOp — restore-vs-delete race (wrongful-loss guard)", () => {
  it("does NOT delete a memory that was restored between the scan and the delete write", async () => {
    // A row archived past the window — the sweep's scan would mark it for delete.
    const id = await seed({
      content: "rescued at the last second",
      factType: "other",
      archivedAt: NOW - (HARD_DELETE_WINDOW_MS + 10 * DAY),
    });

    // The user hits Restore before the delete write lands.
    expect(await restoreVaultMemoryOp(vaultCtx, id)).toBe(true);
    expect(await archivedAtOf(id)).toBeNull();

    // The guarded delete re-reads archived_at inside the write → row no longer
    // archived → it must lose. The memory survives.
    const deleted = await hardDeleteDecayedOp(vaultCtx, id, {
      hardDeleteWindowMs: HARD_DELETE_WINDOW_MS,
      now: NOW,
    });
    expect(deleted).toBe(false);
    expect(await getVaultMemoryOp(vaultCtx, id)).not.toBeNull();
  });

  it("does NOT delete a row re-archived more recently than the window", async () => {
    const id = await seed({
      content: "re-archived recently",
      factType: "other",
      archivedAt: NOW - (HARD_DELETE_WINDOW_MS + 10 * DAY),
    });
    // Re-archive at NOW (e.g. a fresh decay after a restore+re-stale cycle).
    await restoreVaultMemoryOp(vaultCtx, id);
    await archiveVaultMemoryOp(vaultCtx, id, { now: NOW });

    const deleted = await hardDeleteDecayedOp(vaultCtx, id, {
      hardDeleteWindowMs: HARD_DELETE_WINDOW_MS,
      now: NOW,
    });
    expect(deleted).toBe(false);
    expect(await getVaultMemoryOp(vaultCtx, id)).not.toBeNull();
  });

  it("deletes a row that is still archived past the window", async () => {
    const id = await seed({
      content: "genuinely expired",
      factType: "other",
      archivedAt: NOW - (HARD_DELETE_WINDOW_MS + 10 * DAY),
    });
    const deleted = await hardDeleteDecayedOp(vaultCtx, id, {
      hardDeleteWindowMs: HARD_DELETE_WINDOW_MS,
      now: NOW,
    });
    expect(deleted).toBe(true);
    expect(await getVaultMemoryOp(vaultCtx, id)).toBeNull();
  });
});

describe("cross-user amplification guard", () => {
  it("throws when creating a sweeper on an unscoped (no userId, no wallet) context", () => {
    const unscoped = {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    } as VaultMemoryOperationsContext;
    expect(() => createDecaySweeper({ vaultCtx: unscoped, now: NOW })).toThrow(/unscoped/i);
  });

  it("throws when scanning candidates on an unscoped context", async () => {
    const unscoped = {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
    } as VaultMemoryOperationsContext;
    await expect(getDecayCandidatesRawOp(unscoped)).rejects.toThrow(/unscoped/i);
  });

  it("allows a userId-scoped context (server multi-tenant, correctly scoped)", () => {
    const scoped = {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
      userId: "user-1",
    } as VaultMemoryOperationsContext;
    expect(() => createDecaySweeper({ vaultCtx: scoped, now: NOW })).not.toThrow();
  });

  it("REFUSES a bare walletAddress context (no userId, not singleTenant)", () => {
    // Behavior change: walletAddress alone no longer passes — it doesn't scope
    // the sweep query, so trusting it was an unstated multi-tenant risk.
    const walletOnly = {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
      walletAddress: "0xtest",
    } as VaultMemoryOperationsContext;
    expect(() => createDecaySweeper({ vaultCtx: walletOnly, now: NOW })).toThrow(/unscoped/i);
    return expect(getDecayCandidatesRawOp(walletOnly)).rejects.toThrow(/unscoped/i);
  });

  it("allows a singleTenant per-wallet client DB context (no userId)", () => {
    const perWallet = {
      database,
      vaultMemoryCollection: database.get<VaultMemory>("memory_vault"),
      walletAddress: "0xtest",
      singleTenant: true,
    } as VaultMemoryOperationsContext;
    expect(() => createDecaySweeper({ vaultCtx: perWallet, now: NOW })).not.toThrow();
  });
});

describe("archive → restore round trip", () => {
  it("archiving drops the row from recall; restoring brings it back", async () => {
    const id = await seed({ content: "fact to archive then restore", factType: "other" });

    // Active initially.
    expect((await getAllVaultMemoriesOp(vaultCtx)).map((m) => m.uniqueId)).toContain(id);

    expect(await archiveVaultMemoryOp(vaultCtx, id, { now: NOW })).toBe(true);
    // Excluded from the default recall lane, present in the archived view.
    expect((await getAllVaultMemoriesOp(vaultCtx)).map((m) => m.uniqueId)).not.toContain(id);
    expect(
      (await getAllVaultMemoriesOp(vaultCtx, { includeArchived: true })).map((m) => m.uniqueId)
    ).toContain(id);

    expect(await restoreVaultMemoryOp(vaultCtx, id)).toBe(true);
    // Back in the default lane, archived_at cleared.
    expect((await getAllVaultMemoriesOp(vaultCtx)).map((m) => m.uniqueId)).toContain(id);
    expect(await archivedAtOf(id)).toBeNull();
  });

  it("restore is a no-op-safe on an already-active row and false on a deleted one", async () => {
    const id = await seed({ content: "already active", factType: "other" });
    expect(await restoreVaultMemoryOp(vaultCtx, id)).toBe(true);
    expect(await archivedAtOf(id)).toBeNull();
    expect(await restoreVaultMemoryOp(vaultCtx, "does-not-exist")).toBe(false);
  });
});

describe("getDecayCandidatesRawOp — scan shape and inclusion", () => {
  it("returns plaintext-only fields and includes archived but not hard-deleted rows", async () => {
    const active = await seed({ content: "active", factType: "plan" });
    const archived = await seed({ content: "archived", factType: "other", archivedAt: NOW - DAY });

    const candidates = await getDecayCandidatesRawOp(vaultCtx);
    const ids = candidates.map((c) => c.uniqueId);
    expect(ids).toContain(active);
    expect(ids).toContain(archived);

    const activeRow = candidates.find((c) => c.uniqueId === active)!;
    // Shape: exactly the plaintext decay fields, no `content` key.
    expect(Object.keys(activeRow).sort()).toEqual(
      [
        "archivedAt",
        "eventTimeEnd",
        "eventTimeKind",
        "factType",
        "source",
        "uniqueId",
        "updatedAt",
      ].sort()
    );
    expect(activeRow.factType).toBe("plan");
    expect(activeRow.source).toBe("auto-extracted");
    expect(candidates.find((c) => c.uniqueId === archived)!.archivedAt).toBe(NOW - DAY);
  });
});

describe("createDecaySweeper.runSweep — zero-knowledge", () => {
  it("never decrypts content during a sweep that archives and deletes", async () => {
    // A row to archive, a row to delete, a row to keep — exercise every branch.
    await seed({
      content: "aged → archive",
      factType: "other",
      updatedAt: NOW - (MEDIUM_TTL_MS + 20 * DAY),
    });
    await seed({
      content: "long-archived → delete",
      factType: "other",
      archivedAt: NOW - (HARD_DELETE_WINDOW_MS + 10 * DAY),
    });
    await seed({ content: "fresh → keep", factType: "identity", updatedAt: NOW });

    // Sanity: decryption IS wired (seeding + a normal read use it).
    await getAllVaultMemoriesOp(vaultCtx);
    expect(encMocks.decrypt).toHaveBeenCalled();

    encMocks.decrypt.mockClear();
    const result = await createDecaySweeper({ vaultCtx, now: NOW }).runSweep();

    expect(result.archived).toBe(1);
    expect(result.deleted).toBe(1);
    // The whole sweep path (scan → classify → archive/delete) touched no
    // ciphertext: decryptVaultMemoryFields was never called.
    expect(encMocks.decrypt).not.toHaveBeenCalled();
  });
});

describe("createDecaySweeper — PR5 classifier seam", () => {
  it("routes borderline verdicts through an optional classifier, overriding the rule", async () => {
    // A FRESH `other` fact the rule engine would KEEP — but `other` is
    // borderline, so the classifier is consulted and flips it to "archive",
    // proving the seam can override (without decrypting here).
    const borderlineId = await seed({
      content: "borderline fact",
      factType: "other",
      updatedAt: NOW,
    });

    const sweeper = createDecaySweeper({
      vaultCtx,
      now: NOW,
      classifier: {
        classify: () => "archive",
      },
    });

    const result = await sweeper.runSweep();
    expect(result.archived).toBe(1);
    expect(await archivedAtOf(borderlineId)).toBe(NOW);
  });

  it("consults the classifier ONLY for borderline rows (never clear keep/delete)", async () => {
    // Borderline: `other` (age-only bucket) and a `plan` with no event end.
    await seed({ content: "other fact", factType: "other", updatedAt: NOW });
    await seed({
      content: "plan without an end",
      factType: "plan",
      eventTime: { start: NOW - 40 * DAY, end: null, kind: "point" },
      updatedAt: NOW,
    });
    // Clear (NOT borderline): durable identity (rule keep) + a plan whose event
    // ended in the past (rule archives it deterministically via event_time_end).
    await seed({ content: "identity fact", factType: "identity", updatedAt: NOW });
    await seed({
      content: "plan already past",
      factType: "plan",
      eventTime: {
        start: NOW - 60 * DAY,
        end: NOW - (PAST_EVENT_GRACE_MS + 5 * DAY),
        kind: "range",
      },
      updatedAt: NOW,
    });

    const seen: (string | null)[] = [];
    const classify = vi.fn((input: DecayInput, ruleVerdict: DecayVerdict): DecayVerdict => {
      seen.push(input.factType);
      return ruleVerdict; // passthrough — don't change outcomes
    });

    const sweeper = createDecaySweeper({ vaultCtx, now: NOW, classifier: { classify } });
    await sweeper.runSweep();

    // Exactly the two borderline rows reached the classifier.
    expect(classify).toHaveBeenCalledTimes(2);
    expect(seen.sort()).toEqual(["other", "plan"]);
  });

  it("HIGH regression: an active MANUAL row is NEVER borderline — classifier not called, stays keep", async () => {
    // A manual row with a borderline factType (`other`) AND with null factType —
    // both would be borderline for an auto-extracted row. The rule engine keeps
    // manual rows (source==="manual" → keep), so the escalation gate passes and,
    // WITHOUT the manual guard in isBorderline, they would reach the classifier.
    // A classifier that WOULD archive them must NOT be consulted at all, so the
    // "manual is never auto-archived" guarantee holds via the classifier path.
    const manualOther = await seed({
      content: "user-curated fact",
      source: "manual",
      factType: "other",
      updatedAt: NOW,
    });
    const manualUntyped = await seed({
      content: "user-curated untyped fact",
      source: "manual",
      updatedAt: NOW, // no factType → null bucket (would be borderline if auto)
    });

    const classify = vi.fn((): DecayVerdict => "archive"); // hostile: always archive
    const sweeper = createDecaySweeper({ vaultCtx, now: NOW, classifier: { classify } });

    const result = await sweeper.runSweep();

    // Neither manual row was archived, and the classifier was never invoked for
    // either (manual rows never egress content to / are decided by the classifier).
    expect(classify).not.toHaveBeenCalled();
    expect(result.archived).toBe(0);
    expect(await archivedAtOf(manualOther)).toBeNull();
    expect(await archivedAtOf(manualUntyped)).toBeNull();
  });

  it("PR5: updateVaultMemoryOp { restore: true } clears archived_at (un-archive primitive)", async () => {
    const id = await seed({ content: "resurrectable fact", factType: "other", updatedAt: NOW });
    await archiveVaultMemoryOp(vaultCtx, id, { now: NOW });
    expect(await archivedAtOf(id)).toBe(NOW);

    const updated = await updateVaultMemoryOp(vaultCtx, id, {
      content: "resurrectable fact",
      restore: true,
    });
    expect(updated).not.toBeNull();
    expect(await archivedAtOf(id)).toBeNull();
  });

  it("threads the row id to the classifier so it can fetch decrypted content", async () => {
    const id = await seed({ content: "borderline fact", factType: "other", updatedAt: NOW });
    const classify = vi.fn(
      (_input: DecayInput, ruleVerdict: DecayVerdict): DecayVerdict => ruleVerdict
    );
    const sweeper = createDecaySweeper({ vaultCtx, now: NOW, classifier: { classify } });
    await sweeper.runSweep();
    expect(classify).toHaveBeenCalledTimes(1);
    expect(classify.mock.calls[0][0].id).toBe(id);
  });

  it("PR5 security: respects the per-sweep classifier ceiling (rest use rule verdict, no call)", async () => {
    // Four borderline rows, ceiling of 2 → only 2 reach the classifier this
    // sweep; the other two fall back to the rule verdict with no call.
    for (let i = 0; i < 4; i++) {
      await seed({ content: `borderline ${i}`, factType: "other", updatedAt: NOW });
    }
    const classify = vi.fn((_i: DecayInput, rule: DecayVerdict): DecayVerdict => rule);
    const sweeper = createDecaySweeper({
      vaultCtx,
      now: NOW,
      classifier: { classify },
      maxClassifierCallsPerSweep: 2,
    });
    await sweeper.runSweep();
    expect(classify).toHaveBeenCalledTimes(2);
  });

  it("PR5 security: a stable 'keep' borderline row is NOT re-classified on a later sweep", async () => {
    await seed({ content: "stable borderline fact", factType: "other", updatedAt: NOW });
    const classify = vi.fn((): DecayVerdict => "keep");
    const sweeper = createDecaySweeper({ vaultCtx, now: NOW, classifier: { classify } });

    await sweeper.runSweep(); // first sweep classifies + caches "keep"
    await sweeper.runSweep(); // second sweep: unchanged updated_at → cache hit, no call

    // Only one portal-bound classify call across BOTH sweeps.
    expect(classify).toHaveBeenCalledTimes(1);
  });

  it("PR5 security: a re-observed borderline row (bumped updated_at) IS re-classified", async () => {
    const id = await seed({ content: "changing fact", factType: "other", updatedAt: NOW });
    const classify = vi.fn((): DecayVerdict => "keep");
    const sweeper = createDecaySweeper({ vaultCtx, now: NOW, classifier: { classify } });

    await sweeper.runSweep();
    // Simulate a re-observation bumping updated_at (retain merge).
    const rec = await vaultCtx.vaultMemoryCollection.find(id);
    await database.write(async () => {
      await rec.update((r) => r._setRaw("updated_at", NOW + DAY));
    });
    await sweeper.runSweep();

    // Cache miss on the new updated_at → classified again.
    expect(classify).toHaveBeenCalledTimes(2);
  });

  it("falls back to the rule verdict when the classifier throws", async () => {
    // A FRESH borderline `other` row → rule verdict is KEEP, so the classifier
    // IS consulted (a rule archive/delete short-circuits before it). It throws;
    // the sweep must fall back to the rule verdict (keep) → nothing archived.
    const id = await seed({ content: "fresh borderline", factType: "other", updatedAt: NOW });
    const sweeper = createDecaySweeper({
      vaultCtx,
      now: NOW,
      classifier: {
        classify: () => {
          throw new Error("on-device model unavailable");
        },
      },
    });
    const result = await sweeper.runSweep();
    // Classifier threw on a rule-keep row → falls back to keep; nothing archived.
    expect(result.archived).toBe(0);
    expect(await archivedAtOf(id)).toBeNull();
  });

  it("HIGH regression: a borderline row cached 'keep' at day 10 IS archived at day 200 when the rule crosses its TTL", async () => {
    // A borderline `other` row, never re-observed (updated_at fixed at NOW).
    const id = await seed({ content: "borderline other fact", factType: "other", updatedAt: NOW });
    // Classifier always says keep — its verdict is cached after the first call.
    const classify = vi.fn((): DecayVerdict => "keep");

    let clock = NOW + 10 * DAY; // day 10 — well within the 180-day medium TTL
    const sweeper = createDecaySweeper({ vaultCtx, now: () => clock, classifier: { classify } });

    // Day 10: the rule keeps (fresh) → classifier consulted → keep, cached.
    expect(await sweeper.runSweep()).toEqual({ archived: 0, deleted: 0, scanned: 1 });

    // Day 200: the medium TTL (180d) has elapsed, so the RULE now says archive.
    // The stale cached "keep" must NOT freeze the escalation — the row archives.
    clock = NOW + 200 * DAY;
    expect(await sweeper.runSweep()).toEqual({ archived: 1, deleted: 0, scanned: 1 });
    expect(await archivedAtOf(id)).toBe(clock);

    // The classifier ran ONLY at day 10 (rule keep + borderline). At day 200 the
    // rule escalated first, so the classifier — and its stale cache — are bypassed.
    expect(classify).toHaveBeenCalledTimes(1);
  });
});
