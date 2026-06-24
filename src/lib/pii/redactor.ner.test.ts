import { describe, expect, it, vi } from "vitest";

import type { LlmapiMessage } from "../../client";
import type { NerDetector, PiiSpan } from "./ner";
import { PiiRedactor } from "./redactor";

/**
 * A deterministic fake {@link NerDetector} for tests: returns a span for every
 * occurrence of each configured phrase. No model, no async I/O of substance.
 */
function fakeDetector(entities: { text: string; category: string; score?: number }[]): NerDetector {
  return {
    async detect(text: string): Promise<PiiSpan[]> {
      const spans: PiiSpan[] = [];
      for (const e of entities) {
        let from = 0;
        let idx: number;
        while ((idx = text.indexOf(e.text, from)) !== -1) {
          spans.push({
            start: idx,
            end: idx + e.text.length,
            category: e.category,
            score: e.score ?? 0.99,
          });
          from = idx + e.text.length;
        }
      }
      return spans;
    },
  };
}

describe("PiiRedactor — NER (async) path", () => {
  it("redacts unstructured PII (PERSON/LOCATION/ORG) and round-trips", async () => {
    const redactor = new PiiRedactor({
      nerDetector: fakeDetector([
        { text: "Sarah Chen", category: "PERSON" },
        { text: "Seattle", category: "LOCATION" },
        { text: "Boeing", category: "ORG" },
      ]),
    });
    const input = "Hi, I'm Sarah Chen. Email sarah@example.com. Moved to Seattle for Boeing.";
    const { text, matches } = await redactor.redactTextAsync(input);

    expect(text).toBe("Hi, I'm [PERSON_1]. Email [EMAIL_1]. Moved to [LOCATION_1] for [ORG_1].");
    // regex EMAIL + three NER entities
    expect(matches.map((m) => m.category).sort()).toEqual(["EMAIL", "LOCATION", "ORG", "PERSON"]);
    // exact round-trip restores every original
    expect(redactor.deAnonymize(text)).toBe(input);
  });

  it("lets the regex layer win on overlap (address is not clobbered by a LOCATION span)", async () => {
    const redactor = new PiiRedactor({
      // The NER detector tags part of the street address as a LOCATION; regex
      // should still claim the full US_ADDRESS.
      nerDetector: fakeDetector([{ text: "Pinecrest Avenue", category: "LOCATION" }]),
    });
    const { text } = await redactor.redactTextAsync(
      "I live at 412 Pinecrest Avenue near downtown."
    );

    expect(text).toContain("[US_ADDRESS_1]");
    expect(text).not.toContain("[LOCATION");
    expect(text).not.toContain("412 ["); // the house number did not leak
  });

  it("snaps a sub-word NER span to whole-word boundaries (no partial placeholder)", async () => {
    const redactor = new PiiRedactor({
      // Detector tagged only "Strip" of "Stripe" (a WordPiece artifact).
      nerDetector: fakeDetector([{ text: "Strip", category: "ORG" }]),
    });
    const { text } = await redactor.redactTextAsync("I met someone from Stripe today.");

    expect(text).toBe("I met someone from [ORG_1] today.");
    // No placeholder is immediately followed by a leftover word character.
    expect(text).not.toMatch(/\][A-Za-z0-9]/);
  });

  it("falls back to regex-only when the detector throws (fail-open on detection)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const redactor = new PiiRedactor({
      nerDetector: {
        detect: () => Promise.reject(new Error("model unavailable")),
      },
    });
    const { text } = await redactor.redactTextAsync("Email a@b.com, I'm Sarah Chen.");

    expect(text).toContain("[EMAIL_1]"); // regex still protects structured PII
    expect(text).toContain("Sarah Chen"); // NER skipped, not blocked
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });

  it("drops malformed detector spans (NaN / out-of-bounds / negative) without corrupting output", async () => {
    const malformed: NerDetector = {
      async detect(): Promise<PiiSpan[]> {
        return [
          { start: NaN, end: 5, category: "PERSON" },
          { start: -3, end: 4, category: "LOCATION" },
          { start: 2, end: 9999, category: "ORG" },
          { start: 8, end: 4, category: "ORG" }, // start > end
        ];
      },
    };
    const redactor = new PiiRedactor({ nerDetector: malformed });
    const { text } = await redactor.redactTextAsync("Hello World, email a@b.com");
    // No partial/duplicated placeholder; out-of-bounds span (2..len) snaps to a
    // whole-word region and is the only NER span that survives.
    expect(text).not.toMatch(/\][A-Za-z0-9]/);
    expect(text).not.toContain("[PERSON_1][PERSON_1]");
    expect(text).toContain("[EMAIL_1]"); // regex still applied
  });

  it("degrades to regex-only when the detector returns a non-array", async () => {
    const bogus = { detect: async () => null as unknown as PiiSpan[] };
    const redactor = new PiiRedactor({ nerDetector: bogus });
    const { text } = await redactor.redactTextAsync("Email a@b.com please");
    expect(text).toBe("Email [EMAIL_1] please");
  });

  it("masks (stateless) across regex + NER with unnumbered tags", async () => {
    const redactor = new PiiRedactor({
      nerDetector: fakeDetector([{ text: "Sarah Chen", category: "PERSON" }]),
    });
    const masked = await redactor.maskTextAsync("Sarah Chen <a@b.com> and Sarah Chen again");
    expect(masked).toBe("[PERSON] <[EMAIL]> and [PERSON] again");
  });

  it("redacts message arrays and keeps placeholder numbering consistent across parts", async () => {
    const redactor = new PiiRedactor({
      nerDetector: fakeDetector([{ text: "Sarah Chen", category: "PERSON" }]),
    });
    const messages: LlmapiMessage[] = [
      { role: "user", content: [{ type: "text", text: "I'm Sarah Chen." }] },
      { role: "user", content: [{ type: "text", text: "Yes, Sarah Chen here." }] },
    ];
    const { messages: out } = await redactor.redactMessagesAsync(messages);

    // Same value → same placeholder across messages.
    expect((out[0].content?.[0] as { text: string }).text).toBe("I'm [PERSON_1].");
    expect((out[1].content?.[0] as { text: string }).text).toBe("Yes, [PERSON_1] here.");
  });

  it("integrates NER placeholders with restoreForStorage", async () => {
    const redactor = new PiiRedactor({
      nerDetector: fakeDetector([{ text: "Sarah Chen", category: "PERSON" }]),
    });
    const { text } = await redactor.redactTextAsync("I'm Sarah Chen.");
    // A model echo with brackets dropped is still resolved.
    expect(redactor.restoreForStorage("note about PERSON_1")).toEqual({
      text: "note about Sarah Chen",
      unresolved: false,
    });
    // A hallucinated placeholder is flagged.
    expect(redactor.restoreForStorage("see [PERSON_9]").unresolved).toBe(true);
    expect(text).toContain("[PERSON_1]");
  });
});

describe("PiiRedactor — async path equals sync when NER adds nothing", () => {
  const SAMPLES = [
    "Contact john@example.com or call (415) 555-1212 today.",
    "SSN 521-22-1845 and card 4111 1111 1111 1111 on file.",
    "No PII here, just a normal sentence.",
    "Two emails: a@b.com and c@d.com; one phone +14155551212.",
    "My DOB is 01/02/1990 and server 192.168.1.1.",
  ];

  it("redactTextAsync with no detector is byte-identical to redactText", async () => {
    for (const sample of SAMPLES) {
      const sync = new PiiRedactor().redactText(sample);
      const async_ = await new PiiRedactor().redactTextAsync(sample);
      expect(async_).toEqual(sync);
    }
  });

  it("redactTextAsync with a detector that finds nothing matches sync output", async () => {
    const empty = fakeDetector([]);
    for (const sample of SAMPLES) {
      const sync = new PiiRedactor().redactText(sample);
      const async_ = await new PiiRedactor({ nerDetector: empty }).redactTextAsync(sample);
      expect(async_.text).toBe(sync.text);
      expect(async_.matches).toEqual(sync.matches);
    }
  });

  it("maskTextAsync with no detector matches maskText", async () => {
    for (const sample of SAMPLES) {
      expect(await new PiiRedactor().maskTextAsync(sample)).toBe(
        new PiiRedactor().maskText(sample)
      );
    }
  });
});
