import { afterEach, describe, expect, it, vi } from "vitest";

import { noopLogger, setLogger } from "../logger";

import {
  classifyDecay,
  type DecayInput,
  DEFAULT_DECAY_POLICY,
  HARD_DELETE_WINDOW_MS,
  MEDIUM_TTL_MS,
  NEVER_TTL_MS,
  PAST_EVENT_GRACE_MS,
  SHORT_TTL_MS,
  ttlForType,
} from "./decay";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 1); // 2026-07-01, fixed reference

/** All FactTypes the extractor can emit, plus null (untyped/legacy). */
const NEVER_TYPES = ["identity", "preference", "relationship", "constraint"] as const;
const SHORT_TYPES = ["plan", "ongoing_context"] as const;
const MEDIUM_TYPES = ["other", null] as const;

function input(overrides: Partial<DecayInput> = {}): DecayInput {
  return {
    factType: "other",
    eventTimeEnd: null,
    eventTimeKind: null,
    updatedAt: NOW, // fresh by default
    archivedAt: null,
    source: "auto-extracted",
    ...overrides,
  };
}

describe("ttlForType", () => {
  it("maps durable identity-class types to Infinity", () => {
    for (const t of NEVER_TYPES) expect(ttlForType(t)).toBe(NEVER_TTL_MS);
  });

  it("maps plan / ongoing_context to the short TTL", () => {
    for (const t of SHORT_TYPES) expect(ttlForType(t)).toBe(SHORT_TTL_MS);
  });

  it("maps other and null/unknown to the medium TTL", () => {
    expect(ttlForType("other")).toBe(MEDIUM_TTL_MS);
    expect(ttlForType(null)).toBe(MEDIUM_TTL_MS);
    expect(ttlForType("some-future-type")).toBe(MEDIUM_TTL_MS);
  });
});

describe("classifyDecay — manual source is protected from auto-archive only", () => {
  it("keeps a manual memory even when ancient and event-past (no auto-archive)", () => {
    const verdict = classifyDecay(
      input({
        source: "manual",
        factType: "plan",
        updatedAt: NOW - 10 * 365 * DAY,
        eventTimeEnd: NOW - 5 * 365 * DAY,
      }),
      NOW
    );
    expect(verdict).toBe("keep");
  });

  it("keeps a fresh manual memory", () => {
    expect(classifyDecay(input({ source: "manual", factType: "other", updatedAt: NOW }), NOW)).toBe(
      "keep"
    );
  });

  it("DELETES a manual memory that is archived past the window (purge clock applies to all)", () => {
    // Product decision: once archived, the 30d hard-delete clock applies even to
    // manual rows — the archived check runs before the manual short-circuit.
    const verdict = classifyDecay(
      input({ source: "manual", archivedAt: NOW - (HARD_DELETE_WINDOW_MS + DAY) }),
      NOW
    );
    expect(verdict).toBe("delete");
  });

  it("keeps a manual memory that is archived but still inside the window", () => {
    const verdict = classifyDecay(
      input({ source: "manual", archivedAt: NOW - (HARD_DELETE_WINDOW_MS - DAY) }),
      NOW
    );
    expect(verdict).toBe("keep");
  });
});

describe("classifyDecay — archived → delete transition", () => {
  it("keeps an archived row still inside the hard-delete window", () => {
    const verdict = classifyDecay(input({ archivedAt: NOW - (HARD_DELETE_WINDOW_MS - DAY) }), NOW);
    expect(verdict).toBe("keep");
  });

  it("deletes an archived row past the hard-delete window", () => {
    const verdict = classifyDecay(input({ archivedAt: NOW - (HARD_DELETE_WINDOW_MS + DAY) }), NOW);
    expect(verdict).toBe("delete");
  });

  it("keeps an archived durable-type row inside the window (window, not TTL, governs)", () => {
    const verdict = classifyDecay(
      input({ factType: "identity", archivedAt: NOW - (HARD_DELETE_WINDOW_MS - DAY) }),
      NOW
    );
    expect(verdict).toBe("keep");
  });
});

describe("classifyDecay — plan/ongoing_context event-past archiving", () => {
  for (const t of SHORT_TYPES) {
    it(`archives ${t} whose event ended past the grace window`, () => {
      const verdict = classifyDecay(
        input({
          factType: t,
          eventTimeEnd: NOW - (PAST_EVENT_GRACE_MS + DAY),
          eventTimeKind: "range",
        }),
        NOW
      );
      expect(verdict).toBe("archive");
    });

    it(`keeps ${t} whose event ended but is still inside the grace window`, () => {
      const verdict = classifyDecay(
        input({
          factType: t,
          eventTimeEnd: NOW - (PAST_EVENT_GRACE_MS - DAY),
          eventTimeKind: "range",
          updatedAt: NOW, // fresh, so age fallback won't fire either
        }),
        NOW
      );
      expect(verdict).toBe("keep");
    });

    it(`keeps ${t} whose event is in the future`, () => {
      const verdict = classifyDecay(
        input({ factType: t, eventTimeEnd: NOW + 30 * DAY, eventTimeKind: "range" }),
        NOW
      );
      expect(verdict).toBe("keep");
    });
  }

  it("does NOT archive an ongoing status with a null event end (still ongoing) when fresh", () => {
    const verdict = classifyDecay(
      input({
        factType: "ongoing_context",
        eventTimeEnd: null,
        eventTimeKind: "ongoing",
        updatedAt: NOW, // fresh
      }),
      NOW
    );
    expect(verdict).toBe("keep");
  });

  it("does not apply the event-past rule to non-plan/ongoing types", () => {
    // identity with a past event end must NOT archive via the event rule, and
    // its TTL is Infinity so age fallback can't fire either.
    const verdict = classifyDecay(
      input({ factType: "identity", eventTimeEnd: NOW - 5 * 365 * DAY, eventTimeKind: "range" }),
      NOW
    );
    expect(verdict).toBe("keep");
  });

  it("does NOT age-archive a future-dated plan even when stale, then archives once the event passes", () => {
    // A plan whose event is upcoming but whose row is older than the short TTL:
    // must be kept (rule 4 exception), NOT archived before the event happens.
    const upcoming = input({
      factType: "plan",
      eventTimeKind: "range",
      eventTimeEnd: NOW + 60 * DAY,
      updatedAt: NOW - (SHORT_TTL_MS + 10 * DAY), // stale by age
    });
    expect(classifyDecay(upcoming, NOW)).toBe("keep");

    // Once "now" advances past the event end + grace, rule 3 archives it.
    const later = NOW + 60 * DAY + PAST_EVENT_GRACE_MS + DAY;
    expect(classifyDecay(upcoming, later)).toBe("archive");
  });
});

describe("classifyDecay — degenerate timestamps", () => {
  const warn = vi.fn();
  afterEach(() => {
    warn.mockReset();
    setLogger(noopLogger); // restore a silent logger for other tests
  });

  function withSpyLogger() {
    setLogger({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() });
  }

  it("keeps a row with a NaN updatedAt and warns (no content)", () => {
    withSpyLogger();
    expect(classifyDecay(input({ updatedAt: Number.NaN }), NOW)).toBe("keep");
    expect(warn).toHaveBeenCalledTimes(1);
    const meta = warn.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(meta).not.toHaveProperty("content");
  });

  it("keeps a row with a NaN archivedAt and warns", () => {
    withSpyLogger();
    expect(classifyDecay(input({ archivedAt: Number.NaN }), NOW)).toBe("keep");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("keeps when now itself is non-finite", () => {
    withSpyLogger();
    expect(classifyDecay(input({}), Number.NaN)).toBe("keep");
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it("does not warn on a valid (finite) row", () => {
    withSpyLogger();
    classifyDecay(input({ updatedAt: NOW }), NOW);
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("classifyDecay — age fallback matrix (7 types + null × event × age)", () => {
  const eventVariants: Array<{ label: string; eventTimeEnd: number | null }> = [
    { label: "event-past", eventTimeEnd: NOW - (PAST_EVENT_GRACE_MS + DAY) },
    { label: "event-future", eventTimeEnd: NOW + 30 * DAY },
    { label: "no-event", eventTimeEnd: null },
  ];

  describe("durable types never age-archive", () => {
    for (const t of NEVER_TYPES) {
      for (const ev of eventVariants) {
        it(`${t} / ${ev.label} / ancient → keep`, () => {
          const verdict = classifyDecay(
            input({
              factType: t,
              eventTimeEnd: ev.eventTimeEnd,
              eventTimeKind: ev.eventTimeEnd === null ? null : "range",
              updatedAt: NOW - 10 * 365 * DAY, // ancient
            }),
            NOW
          );
          expect(verdict).toBe("keep");
        });
      }
    }
  });

  describe("short types age-archive past ~30d", () => {
    for (const t of SHORT_TYPES) {
      it(`${t} / no-event / aged past short TTL → archive`, () => {
        const verdict = classifyDecay(
          input({ factType: t, eventTimeEnd: null, updatedAt: NOW - (SHORT_TTL_MS + DAY) }),
          NOW
        );
        expect(verdict).toBe("archive");
      });

      it(`${t} / no-event / fresh → keep`, () => {
        const verdict = classifyDecay(
          input({ factType: t, eventTimeEnd: null, updatedAt: NOW - (SHORT_TTL_MS - DAY) }),
          NOW
        );
        expect(verdict).toBe("keep");
      });
    }
  });

  describe("medium types (other + null) age-archive past ~180d", () => {
    for (const t of MEDIUM_TYPES) {
      const label = t ?? "null";
      it(`${label} / aged past medium TTL → archive`, () => {
        const verdict = classifyDecay(
          input({ factType: t, updatedAt: NOW - (MEDIUM_TTL_MS + DAY) }),
          NOW
        );
        expect(verdict).toBe("archive");
      });

      it(`${label} / fresh → keep`, () => {
        const verdict = classifyDecay(
          input({ factType: t, updatedAt: NOW - (MEDIUM_TTL_MS - DAY) }),
          NOW
        );
        expect(verdict).toBe("keep");
      });

      it(`${label} / aged past SHORT but within MEDIUM → keep (not short bucket)`, () => {
        const verdict = classifyDecay(
          input({ factType: t, updatedAt: NOW - (SHORT_TTL_MS + DAY) }),
          NOW
        );
        expect(verdict).toBe("keep");
      });
    }
  });
});

describe("classifyDecay — policy override", () => {
  it("respects a custom fallback TTL", () => {
    const policy = { fallbackTtlMs: 5 * DAY };
    // 6 days old, factType null → medium bucket → now archives with the tight policy.
    expect(classifyDecay(input({ factType: null, updatedAt: NOW - 6 * DAY }), NOW, policy)).toBe(
      "archive"
    );
    // Same row under the default policy stays kept.
    expect(classifyDecay(input({ factType: null, updatedAt: NOW - 6 * DAY }), NOW)).toBe("keep");
  });

  it("respects a custom hard-delete window", () => {
    const policy = { hardDeleteWindowMs: 2 * DAY };
    expect(classifyDecay(input({ archivedAt: NOW - 3 * DAY }), NOW, policy)).toBe("delete");
  });

  it("exposes a sane default policy shape", () => {
    expect(DEFAULT_DECAY_POLICY.ttlByType.identity).toBe(NEVER_TTL_MS);
    expect(DEFAULT_DECAY_POLICY.ttlByType.plan).toBe(SHORT_TTL_MS);
    expect(DEFAULT_DECAY_POLICY.fallbackTtlMs).toBe(MEDIUM_TTL_MS);
  });
});
