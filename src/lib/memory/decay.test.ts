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
  SOURCE_PHOTO,
  ttlForType,
} from "./decay";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 1);

const NEVER_TYPES = ["identity", "preference", "relationship", "constraint"] as const;
const SHORT_TYPES = ["plan", "ongoing_context"] as const;
const MEDIUM_TYPES = ["other", null] as const;

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

describe("classifyDecay — photo source is protected from auto-archive", () => {
  it("keeps an untyped photo memory well past the medium fallback TTL", () => {
    const verdict = classifyDecay(
      input({
        source: SOURCE_PHOTO,
        factType: null,
        updatedAt: NOW - (MEDIUM_TTL_MS + 30 * DAY),
      }),
      NOW
    );
    expect(verdict).toBe("keep");
  });

  it("keeps a photo memory that is ancient AND event-past", () => {
    const verdict = classifyDecay(
      input({
        source: SOURCE_PHOTO,
        factType: "plan",
        updatedAt: NOW - 10 * 365 * DAY,
        eventTimeEnd: NOW - 5 * 365 * DAY,
      }),
      NOW
    );
    expect(verdict).toBe("keep");
  });

  it("still applies the hard-delete clock once a photo memory IS archived", () => {
    const verdict = classifyDecay(
      input({ source: SOURCE_PHOTO, archivedAt: NOW - (HARD_DELETE_WINDOW_MS + DAY) }),
      NOW
    );
    expect(verdict).toBe("delete");
  });

  it("archives an equivalent row whose source is NOT protected", () => {
    const verdict = classifyDecay(
      input({
        source: "auto-extracted",
        factType: null,
        updatedAt: NOW - (MEDIUM_TTL_MS + 30 * DAY),
      }),
      NOW
    );
    expect(verdict).toBe("archive");
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
          updatedAt: NOW,
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
        updatedAt: NOW,
      }),
      NOW
    );
    expect(verdict).toBe("keep");
  });

  it("does not apply the event-past rule to non-plan/ongoing types", () => {
    const verdict = classifyDecay(
      input({ factType: "identity", eventTimeEnd: NOW - 5 * 365 * DAY, eventTimeKind: "range" }),
      NOW
    );
    expect(verdict).toBe("keep");
  });

  it("does NOT age-archive a future-dated plan even when stale, then archives once the event passes", () => {
    const upcoming = input({
      factType: "plan",
      eventTimeKind: "range",
      eventTimeEnd: NOW + 60 * DAY,
      updatedAt: NOW - (SHORT_TTL_MS + 10 * DAY),
    });
    expect(classifyDecay(upcoming, NOW)).toBe("keep");

    const later = NOW + 60 * DAY + PAST_EVENT_GRACE_MS + DAY;
    expect(classifyDecay(upcoming, later)).toBe("archive");
  });
});

describe("classifyDecay — degenerate timestamps", () => {
  const warn = vi.fn();
  afterEach(() => {
    warn.mockReset();
    setLogger(noopLogger);
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
              updatedAt: NOW - 10 * 365 * DAY,
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
    expect(classifyDecay(input({ factType: null, updatedAt: NOW - 6 * DAY }), NOW, policy)).toBe(
      "archive"
    );
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

describe("distinct re-observation freshness", () => {
  it("keeps old ongoing context confirmed today without changing its edit timestamp", () => {
    expect(
      classifyDecay(
        input({ factType: "ongoing_context", updatedAt: NOW - 60 * DAY, lastObservedAt: NOW }),
        NOW
      )
    ).toBe("keep");
  });
  it("still expires an event that ended, even if mentioned again", () => {
    expect(
      classifyDecay(
        input({ factType: "plan", eventTimeEnd: NOW - 30 * DAY, lastObservedAt: NOW }),
        NOW
      )
    ).toBe("archive");
  });
  it("ignores malformed observation timestamps", () => {
    expect(
      classifyDecay(
        input({ factType: "ongoing_context", updatedAt: NOW - 60 * DAY, lastObservedAt: NaN }),
        NOW
      )
    ).toBe("archive");
  });
});
