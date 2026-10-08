import { describe, expect, it, vi } from "vitest";

import type { NerDetector, PiiSpan } from "../pii/ner";
import { PiiRedactor } from "../pii/redactor";
import type { DecayInput } from "./decay";
import { createLlmDecayClassifier } from "./decayClassifier";

function mockFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  }) as unknown as typeof fetch;
}

const choices = (jsonContent: unknown) => ({
  choices: [{ message: { content: JSON.stringify(jsonContent) } }],
});

const NAME = "Marguerite Okonkwo";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 6, 1);

function input(overrides: Partial<DecayInput> = {}): DecayInput {
  return {
    id: "m1",
    factType: "other",
    eventTimeEnd: null,
    eventTimeKind: null,
    updatedAt: NOW - 100 * DAY,
    archivedAt: null,
    source: "auto-extracted",
    ...overrides,
  };
}

describe("createLlmDecayClassifier", () => {
  it("returns the model's archive verdict, overriding a rule 'keep'", async () => {
    const fetchFn = mockFetch(choices({ verdict: "archive" }));
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => "Was training for the 2025 marathon (already over)",
      backoffMs: () => 0,
    });
    expect(await classifier.classify(input(), "keep", NOW)).toBe("archive");
  });

  it("returns the model's keep verdict, overriding a rule 'archive'", async () => {
    const fetchFn = mockFetch(choices({ verdict: "keep" }));
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => "Is lactose intolerant",
      backoffMs: () => 0,
    });
    expect(await classifier.classify(input(), "archive", NOW)).toBe("keep");
  });

  it("falls back to the rule verdict when getContent returns null (no key)", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => null,
    });
    expect(await classifier.classify(input(), "archive", NOW)).toBe("archive");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("falls back to the rule verdict when getContent throws", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => {
        throw new Error("decrypt failed");
      },
    });
    expect(await classifier.classify(input(), "keep", NOW)).toBe("keep");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("falls back to the rule verdict on an LLM error", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => "some content",
      backoffMs: () => 0,
    });
    expect(await classifier.classify(input(), "archive", NOW)).toBe("archive");
  });

  it("falls back to the rule verdict on a malformed response", async () => {
    const fetchFn = mockFetch(choices({ verdict: "banana" }));
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => "some content",
      backoffMs: () => 0,
    });
    expect(await classifier.classify(input(), "keep", NOW)).toBe("keep");
  });

  it("never escalates to delete — returns the rule verdict without calling the LLM", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const getContent = vi.fn(async () => "content");
    const classifier = createLlmDecayClassifier({ apiKey: "k", fetchFn, getContent });
    expect(await classifier.classify(input(), "delete", NOW)).toBe("delete");
    expect(getContent).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("PR5 security: redacts content by DEFAULT when piiRedaction is omitted", async () => {
    let sentBody = "";
    const fetchFn = vi.fn(async (_url: unknown, init: { body?: unknown }) => {
      sentBody = String(init?.body ?? "");
      return { ok: true, json: async () => choices({ verdict: "keep" }) };
    }) as unknown as typeof fetch;
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => "Email me at bob@acme.com about the trip",
      backoffMs: () => 0,
    });
    await classifier.classify(input(), "archive", NOW);
    expect(fetchFn).toHaveBeenCalled();
    expect(sentBody).not.toContain("bob@acme.com");
  });

  it("PR5 security: only an explicit piiRedaction:false disables redaction", async () => {
    let sentBody = "";
    const fetchFn = vi.fn(async (_url: unknown, init: { body?: unknown }) => {
      sentBody = String(init?.body ?? "");
      return { ok: true, json: async () => choices({ verdict: "keep" }) };
    }) as unknown as typeof fetch;
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      piiRedaction: false,
      getContent: async () => "Email me at bob@acme.com about the trip",
      backoffMs: () => 0,
    });
    await classifier.classify(input(), "archive", NOW);
    expect(sentBody).toContain("bob@acme.com");
  });

  it("applies the caller's NER detector, not just the regex half of it", async () => {
    const detector: NerDetector = {
      async detect(text: string): Promise<PiiSpan[]> {
        const spans: PiiSpan[] = [];
        let at = text.indexOf(NAME);
        while (at !== -1) {
          spans.push({ start: at, end: at + NAME.length, category: "PERSON" });
          at = text.indexOf(NAME, at + 1);
        }
        return spans;
      },
    };
    let sentBody = "";
    const fetchFn = vi.fn(async (_url: unknown, init: { body?: unknown }) => {
      sentBody = String(init?.body ?? "");
      return { ok: true, json: async () => choices({ verdict: "keep" }) };
    }) as unknown as typeof fetch;
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      piiRedaction: new PiiRedactor({ nerDetector: detector }),
      getContent: async () => `Was interviewing at ${NAME}'s startup last spring`,
      backoffMs: () => 0,
    });
    expect(await classifier.classify(input(), "archive", NOW)).toBe("keep");
    expect(sentBody).not.toContain(NAME);
    expect(sentBody).toContain("[PERSON_1]");
  });

  it("falls back to the rule verdict when the row has no id", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => "content",
    });
    expect(await classifier.classify(input({ id: undefined }), "archive", NOW)).toBe("archive");
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("derives ageDays from the injected now, not wall-clock (deterministic)", async () => {
    let sentBody = "";
    const fetchFn = vi.fn(async (_url: unknown, init: { body?: unknown }) => {
      sentBody = String(init?.body ?? "");
      return { ok: true, json: async () => choices({ verdict: "keep" }) };
    }) as unknown as typeof fetch;
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => "durable fact",
      backoffMs: () => 0,
    });

    const updatedAt = NOW - 42 * DAY;
    await classifier.classify(input({ updatedAt }), "keep", NOW);
    expect(fetchFn).toHaveBeenCalled();
    expect(sentBody).toContain("ageDays: 42");
  });

  it("ages a re-observed row from its last observation, not its last edit", async () => {
    let sentBody = "";
    const fetchFn = vi.fn(async (_url: unknown, init: { body?: unknown }) => {
      sentBody = String(init?.body ?? "");
      return { ok: true, json: async () => choices({ verdict: "keep" }) };
    }) as unknown as typeof fetch;
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => "durable fact",
      backoffMs: () => 0,
    });

    await classifier.classify(
      input({ updatedAt: NOW - 300 * DAY, lastObservedAt: NOW - 3 * DAY }),
      "keep",
      NOW
    );
    expect(sentBody).toMatch(/ageDays: 3(?!\d)/);
  });
});
