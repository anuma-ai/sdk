import { describe, expect, it } from "vitest";

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

describe("classifyDecay — manual source is never decayed", () => {
  it("keeps a manual memory even when ancient and event-past", () => {
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

  it("keeps a manual memory even when already archived past the window", () => {
    const verdict = classifyDecay(
      input({ source: "manual", archivedAt: NOW - (HARD_DELETE_WINDOW_MS + DAY) }),
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
