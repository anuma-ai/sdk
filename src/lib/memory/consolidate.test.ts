import { describe, expect, it, vi } from "vitest";

import { noopLogger, setLogger } from "../logger";
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

    it("refuses the whole batch when a multi-target supersede mixes subjects", async () => {
      const mixed = [
        { id: "c1", content: "User lives in Denver.", similarity: 0.87 },
        { id: "c3", content: "User's sister lives in Denver.", similarity: 0.85 },
      ];
      const fetchFn = mockFetch(
        choices({
          action: "supersede",
          targetIds: ["c3", "c1"],
          content: "User's sister lives in Austin.",
          newSubject: "the user's sister",
          targetSubjects: ["the user's sister", "the user"],
        })
      );

      const result = await consolidateMemory("User's sister lives in Austin.", mixed, {
        apiKey: "k",
        fetchFn,
      });

      expect(result).toEqual({
        action: "create",
        content: "User's sister lives in Austin.",
        fallbackReason: "subject_mismatch",
      });
    });

    it("supersedes a multi-target batch when every stated subject matches", async () => {
      const dupes = [
        { id: "c1", content: "User lives in Denver.", similarity: 0.87 },
        { id: "c4", content: "User is based in Denver.", similarity: 0.86 },
      ];
      const fetchFn = mockFetch(
        choices({
          action: "supersede",
          targetIds: ["c1", "c4"],
          content: "User lives in Portland.",
          newSubject: "the user",
          targetSubjects: ["the user", "user"],
        })
      );

      const result = await consolidateMemory("User lives in Portland.", dupes, {
        apiKey: "k",
        fetchFn,
      });

      expect(result.action).toBe("supersede");
      expect(result.targetIds).toEqual(["c1", "c4"]);
    });

    it("refuses on a mismatched subject at any position, including past the id count", async () => {
      const dupes = [
        { id: "c1", content: "User lives in Denver.", similarity: 0.87 },
        { id: "c4", content: "User is based in Denver.", similarity: 0.86 },
      ];
      const fetchFn = mockFetch(
        choices({
          action: "supersede",
          targetIds: ["c1", "nope", "c4"],
          content: "User lives in Portland.",
          newSubject: "the user",
          targetSubjects: ["the user", "the user's sister", "the user"],
        })
      );

      const result = await consolidateMemory("User lives in Portland.", dupes, {
        apiKey: "k",
        fetchFn,
      });

      expect(result.action).toBe("create");
      expect(result.fallbackReason).toBe("subject_mismatch");
    });

    describe("subjects must be read from the same set that gets retired", () => {
      const denverUnion = [
        { id: "c1", content: "User lives in Denver.", similarity: 0.87 },
        { id: "c2", content: "User's sister lives in Denver.", similarity: 0.85 },
      ];

      it.each([
        [
          "empty targetIds, id in the singular slot",
          {
            targetIds: [],
            targetId: "c1",
            targetSubjects: ["the user"],
          },
        ],
        [
          "no targetIds key at all",
          {
            targetId: "c1",
            targetSubjects: ["the user"],
          },
        ],
        [
          "mismatch stated for the id in the singular slot",
          {
            targetIds: ["c2"],
            targetId: "c1",
            targetSubjects: ["the user's sister", "the user"],
          },
        ],
      ])("refuses: %s", async (_name, shape) => {
        const fetchFn = mockFetch(
          choices({
            action: "supersede",
            content: "User's sister lives in Denver.",
            newSubject: "the user's sister",
            ...shape,
          })
        );

        const result = await consolidateMemory("User's sister lives in Denver.", denverUnion, {
          apiKey: "k",
          fetchFn,
        });

        expect(result.action).toBe("create");
        expect(result.fallbackReason).toBe("subject_mismatch");
      });

      it("control: the singular pair alone still refuses", async () => {
        const fetchFn = mockFetch(
          choices({
            action: "supersede",
            targetId: "c1",
            content: "User's sister lives in Denver.",
            newSubject: "the user's sister",
            targetSubject: "the user",
          })
        );

        const result = await consolidateMemory("User's sister lives in Denver.", denverUnion, {
          apiKey: "k",
          fetchFn,
        });

        expect(result.action).toBe("create");
        expect(result.fallbackReason).toBe("subject_mismatch");
      });
    });

    it("leaves behaviour unchanged when the model states no subjects", async () => {
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

    it("logs a refusal at info, not as a degradation", async () => {
      const warn = vi.fn();
      const info = vi.fn();
      setLogger({ debug: vi.fn(), info, warn, error: vi.fn() });
      try {
        const fetchFn = mockFetch(
          choices({
            action: "supersede",
            targetIds: ["c1"],
            content: "User's sister lives in Denver.",
            newSubject: "the user's sister",
            targetSubject: "the user",
          })
        );

        await consolidateMemory("User's sister lives in Denver.", denver, { apiKey: "k", fetchFn });

        expect(warn).not.toHaveBeenCalled();
        expect(info).toHaveBeenCalledTimes(1);
        expect(String(info.mock.calls[0]?.[0])).toContain("refused a cross-subject supersede");
      } finally {
        setLogger(noopLogger);
      }
    });

    it("still logs a real degradation at warn", async () => {
      const warn = vi.fn();
      setLogger({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() });
      try {
        const fetchFn = mockFetch(choices({ action: "supersede", targetId: "c1" }));
        await consolidateMemory("x", denver, { apiKey: "k", fetchFn });
        expect(warn).toHaveBeenCalledTimes(1);
        expect(String(warn.mock.calls[0]?.[0])).toContain("degraded to create");
      } finally {
        setLogger(noopLogger);
      }
    });

    it("ignores the stated subjects on update and noop", async () => {
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
      const detector: NerDetector = {
        detect: async (text: string): Promise<PiiSpan[]> => {
          const at = text.indexOf("Dana");
          return at === -1 ? [] : [{ start: at, end: at + 4, category: "PERSON" }];
        },
      };
      const redactor = new PiiRedactor({ nerDetector: detector });
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
    const result = await consolidateMemory("new fact", candidates, {
      apiKey: "k",
      fetchFn,
      backoffMs: () => 0,
    });
    expect(result).toEqual({ action: "create", content: "new fact", fallbackReason: "llm_error" });
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
    const { fetchFn, bodies } = capturingFetch();
    await consolidateMemory(
      "User's sister lives in Denver.",
      [{ id: "m1", content: "User lives in Denver.", similarity: 0.87 }],
      { apiKey: "k", fetchFn }
    );
    const sent = bodies.join("");
    expect(sent).toContain("newSubject");
    expect(sent).toContain("targetSubject");
    expect(sent).toContain("targetSubjects");
    expect(sent).toContain("do not retire the ones that match and keep the rest");
    expect(sent).toContain("treat the absence of a subject as the user");
  });
});

describe("consolidateMemory — PII redaction", () => {
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

  it("applies the caller's NER detector, not just the regex half of it", async () => {
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
    expect(sent.match(/\[PERSON_\d+\]/g)).toEqual(["[PERSON_1]", "[PERSON_1]"]);
    expect(result.action).toBe("update");
    expect(result.content).toBe("User works with Marguerite Okonkwo at the studio.");
  });

  it("degrades to create when the consolidated content has a BRACKET-DROPPED hallucinated placeholder", async () => {
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
