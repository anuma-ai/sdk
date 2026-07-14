import { describe, expect, it, vi } from "vitest";

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

function input(overrides: Partial<DecayInput> = {}): DecayInput {
  return {
    id: "m1",
    factType: "other",
    eventTimeEnd: null,
    eventTimeKind: null,
    updatedAt: Date.now() - 100 * 24 * 60 * 60 * 1000,
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
    expect(await classifier.classify(input(), "keep")).toBe("archive");
  });

  it("returns the model's keep verdict, overriding a rule 'archive'", async () => {
    const fetchFn = mockFetch(choices({ verdict: "keep" }));
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => "Is lactose intolerant",
      backoffMs: () => 0,
    });
    expect(await classifier.classify(input(), "archive")).toBe("keep");
  });

  it("falls back to the rule verdict when getContent returns null (no key)", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => null,
    });
    expect(await classifier.classify(input(), "archive")).toBe("archive");
    // Zero-knowledge: with no content, no portal call is made.
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
    expect(await classifier.classify(input(), "keep")).toBe("keep");
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
    expect(await classifier.classify(input(), "archive")).toBe("archive");
  });

  it("falls back to the rule verdict on a malformed response", async () => {
    const fetchFn = mockFetch(choices({ verdict: "banana" }));
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => "some content",
      backoffMs: () => 0,
    });
    expect(await classifier.classify(input(), "keep")).toBe("keep");
  });

  it("never escalates to delete — returns the rule verdict without calling the LLM", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const getContent = vi.fn(async () => "content");
    const classifier = createLlmDecayClassifier({ apiKey: "k", fetchFn, getContent });
    expect(await classifier.classify(input(), "delete")).toBe("delete");
    // Delete is deterministic-only; the classifier must not even read content.
    expect(getContent).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("falls back to the rule verdict when the row has no id", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async () => "content",
    });
    expect(await classifier.classify(input({ id: undefined }), "archive")).toBe("archive");
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
