import { describe, expect, it, vi } from "vitest";

import type { NerDetector, PiiSpan } from "../pii/ner";
import { PiiRedactor } from "../pii/redactor";
import { consolidateMemory } from "./consolidate";

function mockFetch(body: unknown, ok = true): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok,
    json: async () => body,
  }) as unknown as typeof fetch;
}

const choices = (jsonContent: unknown) => ({
  choices: [{ message: { content: JSON.stringify(jsonContent) } }],
});

describe("consolidateMemory", () => {
  const candidates = [
    { id: "m1", content: "User has a dog named Mochi.", similarity: 0.78 },
    { id: "m2", content: "User exchanged boots at Zara on 2026-02-05.", similarity: 0.72 },
  ];

  it("returns create when LLM says create", async () => {
    const fetchFn = mockFetch(
      choices({ action: "create", content: "User likes raspberry sorbet." })
    );
    const result = await consolidateMemory("User likes raspberry sorbet.", candidates, {
      apiKey: "k",
      fetchFn,
    });
    expect(result).toEqual({ action: "create", content: "User likes raspberry sorbet." });
  });

  it("returns update with consolidated content when LLM says update", async () => {
    const fetchFn = mockFetch(
      choices({
        action: "update",
        targetId: "m2",
        content: "User exchanged boots at Zara on 2026-02-05 and is awaiting the replacement pair.",
      })
    );
    const result = await consolidateMemory(
      "User has a pair of boots at Zara that they swapped earlier.",
      candidates,
      { apiKey: "k", fetchFn }
    );
    expect(result.action).toBe("update");
    expect(result.targetId).toBe("m2");
    expect(result.content).toContain("Zara");
  });

  it("returns noop with targetId when LLM says noop", async () => {
    const fetchFn = mockFetch(choices({ action: "noop", targetId: "m1" }));
    const result = await consolidateMemory("User has a dog Mochi.", candidates, {
      apiKey: "k",
      fetchFn,
    });
    expect(result).toEqual({ action: "noop", targetId: "m1" });
  });

  it("returns supersede with the stale targetId + new content when LLM says supersede (A2)", async () => {
    const fetchFn = mockFetch(
      choices({ action: "supersede", targetId: "m1", content: "User has a cat named Mochi." })
    );
    const result = await consolidateMemory("User has a cat named Mochi.", candidates, {
      apiKey: "k",
      fetchFn,
    });
    // targetId = the (first) stale fact to retire; targetIds = the full set;
    // content = the NEW fact to persist. A single-id decision normalizes to a
    // one-element targetIds.
    expect(result).toEqual({
      action: "supersede",
      targetId: "m1",
      targetIds: ["m1"],
      content: "User has a cat named Mochi.",
    });
  });

  it("supersede collects ALL stale ids when the LLM returns targetIds[] (multi-supersede)", async () => {
    const fetchFn = mockFetch(
      choices({
        action: "supersede",
        targetIds: ["m1", "m2"],
        content: "User has a cat named Mochi.",
      })
    );
    const result = await consolidateMemory("User has a cat named Mochi.", candidates, {
      apiKey: "k",
      fetchFn,
    });
    expect(result).toEqual({
      action: "supersede",
      targetId: "m1",
      targetIds: ["m1", "m2"],
      content: "User has a cat named Mochi.",
    });
  });

  it("supersede unions targetId when targetIds is empty (single-id not lost)", async () => {
    const fetchFn = mockFetch(
      choices({
        action: "supersede",
        targetIds: [],
        targetId: "m1",
        content: "User has a cat named Mochi.",
      })
    );
    const result = await consolidateMemory("User has a cat named Mochi.", candidates, {
      apiKey: "k",
      fetchFn,
    });
    expect(result).toEqual({
      action: "supersede",
      targetId: "m1",
      targetIds: ["m1"],
      content: "User has a cat named Mochi.",
    });
  });

  it("degrades to create when supersede omits a valid targetId", async () => {
    // Missing/invalid targetId is a schema violation → terminal degrade to
    // create (never silently retire an unknown row).
    const fetchFn = mockFetch(choices({ action: "supersede", content: "new value" }));
    const result = await consolidateMemory("new value", candidates, { apiKey: "k", fetchFn });
    expect(result.action).toBe("create");
    expect(result.fallbackReason).toBe("invalid_response");
  });

  it("degrades to create when supersede omits content", async () => {
    const fetchFn = mockFetch(choices({ action: "supersede", targetId: "m1" }));
    const result = await consolidateMemory("x", candidates, { apiKey: "k", fetchFn });
    expect(result.action).toBe("create");
    expect(result.fallbackReason).toBe("invalid_response");
  });

  // #822 — the subject guard. Prompt rule 1a forbids a cross-subject supersede
  // and ling-2.6-flash violates it anyway (~5-7/8 on the reported fixture), so
  // the rule is enforced here instead. These drive the model's stated subjects
  // directly, so they pin the guard without an LLM.
  describe("cross-subject supersede guard (#822)", () => {
    const denver = [
      { id: "c1", content: "User lives in Denver.", similarity: 0.87 },
      { id: "c2", content: "User visits family a few times a year.", similarity: 0.38 },
    ];

    it("refuses the reported case: a sister's city must not retire the user's", async () => {
      const onFallback = vi.fn();
      const fetchFn = mockFetch(
        choices({
          action: "supersede",
          targetIds: ["c1"],
          content: "User's sister lives in Denver.",
          newSubject: "the user's sister",
          targetSubject: "the user",
        })
      );

      const result = await consolidateMemory("User's sister lives in Denver.", denver, {
        apiKey: "k",
        fetchFn,
        onFallback,
      });

      // create, not supersede: "User lives in Denver." stays readable by recall.
      expect(result).toEqual({
        action: "create",
        content: "User's sister lives in Denver.",
        fallbackReason: "subject_mismatch",
      });
      expect(onFallback).toHaveBeenCalledWith("subject_mismatch");
      expect(onFallback).toHaveBeenCalledTimes(1);
    });

    it("still supersedes a real value change on the same subject", async () => {
      const fetchFn = mockFetch(
        choices({
          action: "supersede",
          targetIds: ["c1"],
          content: "User lives in Portland.",
          newSubject: "the user",
          targetSubject: "user",
        })
      );

      const result = await consolidateMemory("User lives in Portland.", denver, {
        apiKey: "k",
        fetchFn,
      });

      expect(result.action).toBe("supersede");
      expect(result.targetIds).toEqual(["c1"]);
      expect(result.fallbackReason).toBeUndefined();
    });

    it("treats a possessive and a bare relation as the same subject", async () => {
      // "User's sister" vs "sister" is one subject stated two ways — a value
      // change for the sister must still retire the sister's old city.
      const sister = [{ id: "s1", content: "User's sister lives in Denver.", similarity: 0.9 }];
      const fetchFn = mockFetch(
        choices({
          action: "supersede",
          targetIds: ["s1"],
          content: "User's sister lives in Austin.",
          newSubject: "the user's sister",
          targetSubject: "sister",
        })
      );

      const result = await consolidateMemory("User's sister lives in Austin.", sister, {
        apiKey: "k",
        fetchFn,
      });

      expect(result.action).toBe("supersede");
    });

    it.each(["themselves", "they", "the user", "User"])(
      "folds the user alias %s onto one subject",
      async (alias) => {
        const fetchFn = mockFetch(
          choices({
            action: "supersede",
            targetIds: ["c1"],
            content: "User lives in Portland.",
            newSubject: alias,
            targetSubject: "user",
          })
        );

        const result = await consolidateMemory("User lives in Portland.", denver, {
          apiKey: "k",
          fetchFn,
        });

        expect(result.action).toBe("supersede");
      }
    );

    it("leaves behaviour unchanged when the model states no subjects", async () => {
      // Deliberately permissive: requiring the fields would turn every
      // non-compliant supersede into a create, and a stale contradiction left
      // standing is its own harm. Tighten once compliance is measured.
      const fetchFn = mockFetch(
        choices({ action: "supersede", targetIds: ["c1"], content: "User lives in Portland." })
      );

      const result = await consolidateMemory("User lives in Portland.", denver, {
        apiKey: "k",
        fetchFn,
      });

      expect(result.action).toBe("supersede");
      expect(result.fallbackReason).toBeUndefined();
    });

    it("does not fire when only one subject is stated", async () => {
      const fetchFn = mockFetch(
        choices({
          action: "supersede",
          targetIds: ["c1"],
          content: "User lives in Portland.",
          newSubject: "the user",
        })
      );

      const result = await consolidateMemory("User lives in Portland.", denver, {
        apiKey: "k",
        fetchFn,
      });

      expect(result.action).toBe("supersede");
    });

    it("ignores the stated subjects on update and noop", async () => {
      // The guard is scoped to the destructive action. `update` rewrites content
      // and `noop` drops the new fact; neither hides an existing memory from
      // recall, so neither is worth the false-positive risk of a synonym miss.
      const fetchFn = mockFetch(
        choices({
          action: "update",
          targetId: "c1",
          content: "User lives in Denver, in the Highlands.",
          newSubject: "the user's sister",
          targetSubject: "the user",
        })
      );

      const result = await consolidateMemory("...", denver, { apiKey: "k", fetchFn });

      expect(result.action).toBe("update");
      expect(result.fallbackReason).toBeUndefined();
    });

    it("keeps the de-anonymized content when a redacted supersede is refused", async () => {
      // The refusal returns model-authored content, so it goes through the same
      // placeholder restore as an accepted decision — a create carrying
      // "[PERSON_1] lives in Denver" would persist the placeholder.
      const detector: NerDetector = {
        detect: async (text: string): Promise<PiiSpan[]> => {
          const at = text.indexOf("Dana");
          return at === -1 ? [] : [{ start: at, end: at + 4, category: "PERSON" }];
        },
      };
      const redactor = new PiiRedactor({ nerDetector: detector });
      // Take the placeholder from the redactor rather than assuming its name, so
      // this test pins the round trip and not the current token scheme.
      const redacted = await redactor.redactTextAsync("Dana lives in Denver.");
      expect(redacted.text).not.toContain("Dana");

      const fetchFn = mockFetch(
        choices({
          action: "supersede",
          targetIds: ["c1"],
          content: redacted.text,
          newSubject: "Dana",
          targetSubject: "the user",
        })
      );

      const result = await consolidateMemory("Dana lives in Denver.", denver, {
        apiKey: "k",
        fetchFn,
        piiRedaction: redactor,
      });

      expect(result.action).toBe("create");
      expect(result.fallbackReason).toBe("subject_mismatch");
      expect(result.content).toBe("Dana lives in Denver.");
    });
  });

  it("falls back to create when targetId references a memory not in candidates", async () => {
    const fetchFn = mockFetch(choices({ action: "update", targetId: "m99", content: "x" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({
      action: "create",
      content: "new fact",
      fallbackReason: "invalid_response",
    });
  });

  it("falls back to create when no candidates — a short-circuit, not a degraded fallback", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const onFallback = vi.fn();
    const result = await consolidateMemory("new fact", [], { apiKey: "k", fetchFn, onFallback });
    expect(result).toEqual({ action: "create", content: "new fact" });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("falls back to create on empty content — a short-circuit, not a degraded fallback", async () => {
    const fetchFn = vi.fn() as unknown as typeof fetch;
    const onFallback = vi.fn();
    const result = await consolidateMemory("   ", candidates, { apiKey: "k", fetchFn, onFallback });
    expect(result).toEqual({ action: "create", content: "   " });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("retries a transient network error to the default cap, then degrades to create", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    // backoffMs: () => 0 — instant retries so the test doesn't wait the real
    // exponential schedule across the 3-attempt budget.
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn,
      backoffMs: () => 0,
    });
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
    // A network error is transient — consolidate now retries (DEFAULT_CONSOLIDATE_ATTEMPTS = 3)
    // before degrading, so a one-off blip doesn't leave a permanent below-floor paraphrase.
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it("honors a maxAttempts: 1 override (no retry, degrade on first failure)", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn,
      maxAttempts: 1,
    });
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("does not retry a schema violation (parses fine but invalid → degrades on first attempt)", async () => {
    // A well-formed-but-wrong-schema response parses fine, so it's NOT a portal
    // retryable — validate() rejects it post-parse and it degrades immediately,
    // even though maxAttempts defaults to 3.
    const fetchFn = mockFetch(choices({ action: "update", targetId: "nope", content: "x" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result.fallbackReason).toBe("invalid_response");
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it("falls back on non-OK response", async () => {
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn: mockFetch({}, false),
    });
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
  });

  it("falls back on malformed JSON", async () => {
    const fetchFn = mockFetch({
      choices: [{ message: { content: "{not json" } }],
    });
    // Unparseable JSON is transient → retried; () => 0 keeps the test instant.
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn,
      backoffMs: () => 0,
    });
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
  });

  it("falls back on invalid action enum", async () => {
    const fetchFn = mockFetch(choices({ action: "delete", targetId: "m1" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({
      action: "create",
      content: "new fact",
      fallbackReason: "invalid_response",
    });
  });

  it("falls back on update without content", async () => {
    const fetchFn = mockFetch(choices({ action: "update", targetId: "m1" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({
      action: "create",
      content: "new fact",
      fallbackReason: "invalid_response",
    });
  });

  it("degrades (not throws) when options carry no credentials — retain must survive misconfig", async () => {
    const onFallback = vi.fn();
    const result = await consolidateMemory("new fact", candidates, {
      onFallback,
    } as never);
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
    expect(onFallback).toHaveBeenCalledWith("llm_error");
  });

  it("notifies onFallback with llm_error on LLM failure", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const onFallback = vi.fn();
    await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn,
      onFallback,
      backoffMs: () => 0,
    });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledWith("llm_error");
  });

  it("notifies onFallback with invalid_response on schema violation", async () => {
    const fetchFn = mockFetch(choices({ action: "delete" }));
    const onFallback = vi.fn();
    await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn, onFallback });
    expect(onFallback).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledWith("invalid_response");
  });

  it("a throwing onFallback cannot break the write path", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("boom")) as unknown as typeof fetch;
    const onFallback = vi.fn(() => {
      throw new Error("metrics sink exploded");
    });
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn,
      onFallback,
      backoffMs: () => 0,
    });
    // The degraded fallback still comes back — the observability hook's
    // failure is swallowed rather than failing the retain write.
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
    expect(onFallback).toHaveBeenCalledTimes(1);
  });

  it("does not notify onFallback for a real LLM decision", async () => {
    const fetchFn = mockFetch(choices({ action: "noop", targetId: "m1" }));
    const onFallback = vi.fn();
    const result = await consolidateMemory("dup fact", candidates, {
      apiKey: "k",
      fetchFn,
      onFallback,
    });
    expect(result).toEqual({ action: "noop", targetId: "m1" });
    expect(onFallback).not.toHaveBeenCalled();
  });

  it("uses LLM-empty content fallback for create", async () => {
    const fetchFn = mockFetch(choices({ action: "create", content: "" }));
    const result = await consolidateMemory("new fact", candidates, { apiKey: "k", fetchFn });
    expect(result).toEqual({ action: "create", content: "new fact" });
  });
});

describe("consolidateMemory — prompt pins #825 subject/rewording rules", () => {
  /** Fetch mock that records request bodies and returns a noop decision. */
  function capturingFetch(): { fetchFn: typeof fetch; bodies: string[] } {
    const bodies: string[] = [];
    const fetchFn = vi.fn().mockImplementation((_url: string, init?: { body?: unknown }) => {
      bodies.push(typeof init?.body === "string" ? init.body : "");
      return Promise.resolve({
        ok: true,
        json: async () => choices({ action: "noop", targetId: "m1" }),
      });
    }) as unknown as typeof fetch;
    return { fetchFn, bodies };
  }

  it("tells the model a pure rewording is noop, with the kids/children example", async () => {
    // #825 shipped this prompt text without a test; deleting the matching eval
    // fixture left the rule with zero regression coverage. Pin the wording the
    // production prompt uses so a revert can't quietly drop it. The body is
    // JSON-encoded, so quotes arrive escaped.
    const { fetchFn, bodies } = capturingFetch();
    await consolidateMemory(
      "User has two children.",
      [{ id: "m1", content: "User has two kids.", similarity: 0.95 }],
      {
        apiKey: "k",
        fetchFn,
      }
    );
    const sent = bodies.join("");
    expect(sent).toContain('\\"has two kids\\" / \\"has two children\\"');
    expect(sent).toContain('A pure rewording that adds nothing is NOT an update; it is \\"noop\\"');
  });

  it("requires the same subject before merge, with the peanut-allergy example", async () => {
    const { fetchFn, bodies } = capturingFetch();
    await consolidateMemory(
      "User's sister lives in Denver.",
      [{ id: "m1", content: "User lives in Denver.", similarity: 0.87 }],
      { apiKey: "k", fetchFn }
    );
    const sent = bodies.join("");
    expect(sent).toContain("SAME SUBJECT REQUIRED");
    expect(sent).toContain("User's daughter is allergic to peanuts");
    expect(sent).toContain(
      "Never retire the user's own value because a fact about somebody else resembles it"
    );
  });

  it("asks for both subjects on supersede so the #822 guard has something to compare", async () => {
    // The guard is a no-op unless the model states them, and the prompt is the
    // only thing that asks. Pinned because dropping these two lines would
    // silently disarm the guard while every unit test above still passed.
    const { fetchFn, bodies } = capturingFetch();
    await consolidateMemory(
      "User's sister lives in Denver.",
      [{ id: "m1", content: "User lives in Denver.", similarity: 0.87 }],
      { apiKey: "k", fetchFn }
    );
    const sent = bodies.join("");
    expect(sent).toContain("newSubject");
    expect(sent).toContain("targetSubject");
    // A subjectless fact is the user, not an unknown — the extractor omits the
    // subject when it is the user, so the opposite reading would make the guard
    // fire on every ordinary value change.
    expect(sent).toContain("treat the absence of a subject as the user");
  });
});

describe("consolidateMemory — PII redaction", () => {
  /** Fetch mock that records request bodies and returns the given decision JSON. */
  function capturingFetch(decision: unknown): { fetchFn: typeof fetch; bodies: string[] } {
    const bodies: string[] = [];
    const fetchFn = vi.fn().mockImplementation((_url: string, init?: { body?: unknown }) => {
      bodies.push(typeof init?.body === "string" ? init.body : "");
      return Promise.resolve({ ok: true, json: async () => choices(decision) });
    }) as unknown as typeof fetch;
    return { fetchFn, bodies };
  }

  const piiCandidates = [
    { id: "m1", content: "User's email is jane@example.com.", similarity: 0.8 },
  ];

  it("redacts the new fact and candidates before the consolidation model sees them", async () => {
    const { fetchFn, bodies } = capturingFetch({ action: "noop", targetId: "m1" });
    await consolidateMemory("Email jane@example.com again", piiCandidates, {
      apiKey: "k",
      fetchFn,
      piiRedaction: true,
    });

    const sent = bodies.join("");
    expect(sent).not.toContain("jane@example.com");
    expect(sent).toContain("[EMAIL_1]");
  });

  it("de-anonymizes the consolidated content the model returns", async () => {
    // The model reasons over placeholders and echoes one back in its content.
    const { fetchFn } = capturingFetch({
      action: "update",
      targetId: "m1",
      content: "User's email is [EMAIL_1].",
    });
    const result = await consolidateMemory("Reach me at jane@example.com", piiCandidates, {
      apiKey: "k",
      fetchFn,
      piiRedaction: true,
    });

    expect(result.action).toBe("update");
    expect(result.content).toBe("User's email is jane@example.com.");
  });

  it("leaves inputs raw when redaction is disabled (default)", async () => {
    const { fetchFn, bodies } = capturingFetch({ action: "noop", targetId: "m1" });
    await consolidateMemory("Email jane@example.com again", piiCandidates, {
      apiKey: "k",
      fetchFn,
    });
    expect(bodies.join("")).toContain("jane@example.com");
  });

  it("degrades to create when the consolidated content has a hallucinated placeholder", async () => {
    // Only [EMAIL_1] is assigned (jane@example.com); the model emits an update
    // referencing [EMAIL_2], which has no mapping. Rather than overwrite the
    // existing memory with a literal "[EMAIL_2]", degrade to create.
    const { fetchFn } = capturingFetch({
      action: "update",
      targetId: "m1",
      content: "User's email is [EMAIL_2].",
    });
    const result = await consolidateMemory("Reach jane@example.com", piiCandidates, {
      apiKey: "k",
      fetchFn,
      piiRedaction: true,
    });

    expect(result).toEqual({
      action: "create",
      content: "Reach jane@example.com",
      fallbackReason: "invalid_response",
    });
  });

  it("de-anonymizes a BRACKET-DROPPED echo in the consolidated content", async () => {
    // The consolidation model echoes "[EMAIL_1]" back as bare "EMAIL_1"; the
    // storage-path loose restore must still recover the real value so the vault
    // never stores the opaque token.
    const { fetchFn } = capturingFetch({
      action: "update",
      targetId: "m1",
      content: "User's email is EMAIL_1.",
    });
    const result = await consolidateMemory("Reach me at jane@example.com", piiCandidates, {
      apiKey: "k",
      fetchFn,
      piiRedaction: true,
    });

    expect(result.action).toBe("update");
    expect(result.content).toBe("User's email is jane@example.com.");
  });

  // The redactor a caller HANDS us may carry an NER detector, and NER runs only
  // in `redactTextAsync` — the sync `redactText` is regex-only. Redacting this
  // path synchronously shipped every name, location and org to the portal in
  // plain text while emails and phones came back masked, so the leak looked like
  // working redaction, and only for the callers who configured a detector. Both
  // slots are covered because both leave the device: the new fact and every
  // candidate content.
  it("applies the caller's NER detector, not just the regex half of it", async () => {
    // A bare personal name — deliberately something no redactor regex matches.
    // If NER is skipped it survives into the request body.
    const name = "Marguerite Okonkwo";
    const detector: NerDetector = {
      async detect(text: string): Promise<PiiSpan[]> {
        const spans: PiiSpan[] = [];
        let at = text.indexOf(name);
        while (at !== -1) {
          spans.push({ start: at, end: at + name.length, category: "PERSON" });
          at = text.indexOf(name, at + 1);
        }
        return spans;
      },
    };
    // Deliberately the UPDATE path: the model echoes the placeholder back and
    // the result overwrites an existing memory, so the NER round-trip through
    // restoreForStorage has to land the real name in the vault.
    const { fetchFn, bodies } = capturingFetch({
      action: "update",
      targetId: "m1",
      content: "User works with [PERSON_1] at the studio.",
    });
    const result = await consolidateMemory(
      `Works with ${name} at the studio`,
      [{ id: "m1", content: `Knows ${name} from the studio.`, similarity: 0.83 }],
      { apiKey: "k", fetchFn, piiRedaction: new PiiRedactor({ nerDetector: detector }) }
    );

    const sent = bodies.join("");
    expect(sent).not.toContain(name);
    // One value, one placeholder across the new fact and the candidate — the
    // shared value is the entire signal that these are the same fact, so a
    // per-string redactor (or a raced one) would number them apart and the
    // model would see two unrelated people.
    expect(sent.match(/\[PERSON_\d+\]/g)).toEqual(["[PERSON_1]", "[PERSON_1]"]);
    expect(result.action).toBe("update");
    expect(result.content).toBe("User works with Marguerite Okonkwo at the studio.");
  });

  it("degrades to create when the consolidated content has a BRACKET-DROPPED hallucinated placeholder", async () => {
    // Bare, never-assigned "EMAIL_2" — the loose guard must catch it so a bogus
    // token never overwrites the existing memory.
    const { fetchFn } = capturingFetch({
      action: "update",
      targetId: "m1",
      content: "User's backup email is EMAIL_2.",
    });
    const result = await consolidateMemory("Reach jane@example.com", piiCandidates, {
      apiKey: "k",
      fetchFn,
      piiRedaction: true,
    });

    expect(result).toEqual({
      action: "create",
      content: "Reach jane@example.com",
      fallbackReason: "invalid_response",
    });
  });
});
