/**
 * ADVERSARIAL QA — NOT part of the PR2 dev's test matrix.
 * Hunting for boundary off-by-ones and degenerate-input handling in
 * classifyDecay() that decay.test.ts does not exercise (it always tests
 * TTL ± 1 day, never the exact boundary; never NaN/future/negative inputs).
 *
 * Uncommitted scratch file — do not ship. Delete or fold interesting cases
 * into decay.test.ts if kept.
 */
import { describe, expect, it } from "vitest";

import {
  classifyDecay,
  type DecayInput,
  HARD_DELETE_WINDOW_MS,
  MEDIUM_TTL_MS,
  PAST_EVENT_GRACE_MS,
  SHORT_TTL_MS,
} from "./decay";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 1);

function input(overrides: Partial<DecayInput> = {}): DecayInput {
  return {
    factType: "other",
    eventTimeEnd: null,
    eventTimeKind: null,
    updatedAt: NOW,
    archivedAt: null,
    source: "auto-extracted",
    ...overrides,
  };
}

describe("QA: exact-boundary conditions (off-by-one, > vs >=)", () => {
  it("age fallback: now - updatedAt === TTL exactly → keep (strict >, not >=)", () => {
    const verdict = classifyDecay(
      input({ factType: "other", updatedAt: NOW - MEDIUM_TTL_MS }),
      NOW
    );
    expect(verdict).toBe("keep");
  });

  it("age fallback: now - updatedAt === TTL + 1ms → archive", () => {
    const verdict = classifyDecay(
      input({ factType: "other", updatedAt: NOW - MEDIUM_TTL_MS - 1 }),
      NOW
    );
    expect(verdict).toBe("archive");
  });

  it("hard-delete: now - archivedAt === HARD_DELETE_WINDOW_MS exactly → keep (not delete)", () => {
    const verdict = classifyDecay(input({ archivedAt: NOW - HARD_DELETE_WINDOW_MS }), NOW);
    expect(verdict).toBe("keep");
  });

  it("hard-delete: now - archivedAt === HARD_DELETE_WINDOW_MS + 1ms → delete", () => {
    const verdict = classifyDecay(input({ archivedAt: NOW - HARD_DELETE_WINDOW_MS - 1 }), NOW);
    expect(verdict).toBe("delete");
  });

  it("past-event grace: eventTimeEnd === now - grace exactly → keep (strict <, not <=)", () => {
    const verdict = classifyDecay(
      input({
        factType: "plan",
        eventTimeEnd: NOW - PAST_EVENT_GRACE_MS,
        eventTimeKind: "range",
        updatedAt: NOW, // fresh so age fallback can't also fire
      }),
      NOW
    );
    expect(verdict).toBe("keep");
  });

  it("past-event grace: eventTimeEnd === now - grace - 1ms → archive", () => {
    const verdict = classifyDecay(
      input({
        factType: "plan",
        eventTimeEnd: NOW - PAST_EVENT_GRACE_MS - 1,
        eventTimeKind: "range",
        updatedAt: NOW,
      }),
      NOW
    );
    expect(verdict).toBe("archive");
  });

  it("eventTimeEnd === now exactly (event ends this instant) → keep, not archived yet", () => {
    const verdict = classifyDecay(
      input({ factType: "plan", eventTimeEnd: NOW, eventTimeKind: "range", updatedAt: NOW }),
      NOW
    );
    expect(verdict).toBe("keep");
  });
});

describe("QA: degenerate / hostile inputs to classifyDecay", () => {
  it("updatedAt = 0 (epoch, corrupt/never-set row) is treated as ancient → archives for finite-TTL types", () => {
    const verdict = classifyDecay(input({ factType: "other", updatedAt: 0 }), NOW);
    expect(verdict).toBe("archive");
  });

  it("updatedAt = 0 for a durable (never-decay) type still keeps — Infinity TTL wins", () => {
    const verdict = classifyDecay(input({ factType: "identity", updatedAt: 0 }), NOW);
    expect(verdict).toBe("keep");
  });

  it("updatedAt in the FUTURE (clock skew) never archives via age fallback (negative age)", () => {
    const verdict = classifyDecay(input({ factType: "other", updatedAt: NOW + 365 * DAY }), NOW);
    expect(verdict).toBe("keep");
  });

  it("eventTimeEnd in the future never triggers the past-event archive rule", () => {
    const verdict = classifyDecay(
      input({
        factType: "plan",
        eventTimeEnd: NOW + 10 * DAY,
        eventTimeKind: "range",
        updatedAt: NOW,
      }),
      NOW
    );
    expect(verdict).toBe("keep");
  });

  it("archivedAt in the FUTURE (clock skew during archive) never hard-deletes (negative age)", () => {
    const verdict = classifyDecay(input({ archivedAt: NOW + 10 * DAY }), NOW);
    expect(verdict).toBe("keep");
    // NOTE: this means a row archived with a future timestamp (clock skew)
    // is stuck "archived-forever" until real time crosses archivedAt +
    // HARD_DELETE_WINDOW_MS. Self-healing once clocks resync, but flagging:
    // there is no clamping/sanity-check on archivedAt vs `now` anywhere in
    // the archive path (archiveVaultMemoryOp stamps opts.now ?? Date.now()
    // with no upper-bound validation against the DB's own clock).
  });

  it("updatedAt = NaN (corrupt column) never archives — NaN comparisons are always false", () => {
    const verdict = classifyDecay(input({ factType: "other", updatedAt: Number.NaN }), NOW);
    // now - NaN = NaN; `NaN > ttl` is false, so this silently KEEPS forever.
    // This means a corrupted/undefined updated_at column makes a row
    // immortal from the decay sweep's perspective — never crashes, but
    // never cleans up either. Flag: silent-forever-keep on corrupt data,
    // not a crash, but worth a defensive NaN guard for observability.
    expect(verdict).toBe("keep");
  });

  it("archivedAt = NaN never hard-deletes (same NaN-comparison silent-keep behavior)", () => {
    const verdict = classifyDecay(input({ archivedAt: Number.NaN }), NOW);
    expect(verdict).toBe("keep");
  });

  it("eventTimeEnd = NaN never triggers the past-event archive rule (falls through to age fallback)", () => {
    // NaN < (now - grace) is false, so the event-past rule doesn't fire;
    // falls through correctly to the ordinary age-fallback rule for the type.
    const verdict = classifyDecay(
      input({
        factType: "plan",
        eventTimeEnd: Number.NaN,
        eventTimeKind: "range",
        updatedAt: NOW - (SHORT_TTL_MS + DAY),
      }),
      NOW
    );
    expect(verdict).toBe("archive"); // via age fallback, not the event rule
  });

  it("now itself is NaN (bad clock source) — every comparison is false, always keeps", () => {
    const verdict = classifyDecay(
      input({ factType: "other", updatedAt: NOW - (MEDIUM_TTL_MS + DAY) }),
      Number.NaN
    );
    expect(verdict).toBe("keep");
  });

  it("negative updatedAt (before epoch) behaves like any large positive age → archives", () => {
    const verdict = classifyDecay(input({ factType: "other", updatedAt: -1000 }), NOW);
    expect(verdict).toBe("archive");
  });

  it("unrecognized factType string (not one of the 7 known types) falls to medium bucket via classifyDecay (not just ttlForType)", () => {
    const keep = classifyDecay(
      input({ factType: "totally-made-up-type", updatedAt: NOW - (MEDIUM_TTL_MS - DAY) }),
      NOW
    );
    expect(keep).toBe("keep");
    const archive = classifyDecay(
      input({ factType: "totally-made-up-type", updatedAt: NOW - (MEDIUM_TTL_MS + DAY) }),
      NOW
    );
    expect(archive).toBe("archive");
  });

  it("unrecognized factType does NOT get the plan/ongoing_context event-past treatment even with a past eventTimeEnd", () => {
    const verdict = classifyDecay(
      input({
        factType: "totally-made-up-type",
        eventTimeEnd: NOW - (PAST_EVENT_GRACE_MS + DAY),
        eventTimeKind: "range",
        updatedAt: NOW, // fresh, so only the event rule could archive it
      }),
      NOW
    );
    expect(verdict).toBe("keep");
  });
});

describe("QA: manual + archived-past-window (resolved product decision)", () => {
  it("a MANUALLY-ARCHIVED memory past the hard-delete window IS deleted (archive purge applies to all)", () => {
    // Product decision: the archived->delete check runs BEFORE the manual
    // short-circuit. `source="manual"` protects only against AUTO-ARCHIVE — once
    // a memory is archived (however it got there), the 30d hard-delete clock
    // applies to it too, manual or not. So there IS a purge path for
    // manually-archived rows.
    const verdict = classifyDecay(
      input({
        source: "manual",
        archivedAt: NOW - (HARD_DELETE_WINDOW_MS + 365 * DAY), // archived over a year past the window
      }),
      NOW
    );
    expect(verdict).toBe("delete");
  });

  it("a manual memory that is NOT archived is never archived by decay", () => {
    const verdict = classifyDecay(
      input({ source: "manual", factType: "plan", updatedAt: NOW - 5 * 365 * DAY }),
      NOW
    );
    expect(verdict).toBe("keep");
  });
});
