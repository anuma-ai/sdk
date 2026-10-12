import { describe, expect, it } from "vitest";

import { candidateToMemory } from "./suite.js";
import type { ExtractedCandidate } from "../../../../src/lib/memory/autoExtract.js";

const candidate = (over: Partial<ExtractedCandidate> = {}): ExtractedCandidate => ({
  content: "User's partner is Sara",
  type: "other",
  confidence: 0.9,
  sourceMessageIds: ["s#0"],
  entities: [],
  eventTime: null,
  ...over,
});

describe("candidateToMemory", () => {
  it("maps a fact with no temporal anchor to a state memory", () => {
    const m = candidateToMemory(candidate(), 3, "sess-a");

    expect(m.kind).toBe("state");
    expect(m.occurredAt).toBeNull();
    expect(m.sessionIndex).toBe(3);
    expect(m.sessionId).toBe("sess-a");
    expect(m.content).toBe("User's partner is Sara");
    expect(m.confidence).toBe(0.9);
  });

  it("maps a point event to its calendar date", () => {
    const m = candidateToMemory(
      candidate({
        eventTime: { kind: "point", start: Date.parse("2026-03-14T09:30:00Z"), end: null },
      }),
      0,
      "s"
    );

    expect(m.kind).toBe("event");
    expect(m.occurredAt).toBe("2026-03-14");
  });

  it("keeps only the START of a range, which is the one lossy step", () => {
    const m = candidateToMemory(
      candidate({
        eventTime: {
          kind: "range",
          start: Date.parse("2026-05-01T00:00:00Z"),
          end: Date.parse("2026-05-09T00:00:00Z"),
        },
      }),
      0,
      "s"
    );

    expect(m.kind).toBe("event");
    expect(m.occurredAt).toBe("2026-05-01");
  });

  it("treats an ongoing event as an event, not a state", () => {
    const m = candidateToMemory(
      candidate({
        eventTime: { kind: "ongoing", start: Date.parse("2026-01-02T00:00:00Z"), end: null },
      }),
      0,
      "s"
    );

    expect(m.kind).toBe("event");
    expect(m.occurredAt).toBe("2026-01-02");
  });

  it("flattens typed entities to names and drops blanks", () => {
    const m = candidateToMemory(
      candidate({
        entities: [
          { name: "Hollowpoint Labs", kind: "organization" },
          { name: "   ", kind: "thing" },
          { name: "Haskell", kind: "concept" },
        ],
      }),
      0,
      "s"
    );

    expect(m.entities).toEqual(["Hollowpoint Labs", "Haskell"]);
  });

  it("carries no field the suite does not declare", () => {
    const m = candidateToMemory(candidate(), 0, "s");

    expect(Object.keys(m).sort()).toEqual(
      [
        "confidence",
        "content",
        "entities",
        "kind",
        "occurredAt",
        "sessionId",
        "sessionIndex",
      ].sort()
    );
  });
});
