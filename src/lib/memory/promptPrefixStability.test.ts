import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { extractFacts } from "./autoExtract";
import { consolidateMemory } from "./consolidate";
import type { DecayInput } from "./decay";
import { createLlmDecayClassifier } from "./decayClassifier";
import { classifyInjectionCandidates } from "./injectionClassifier";
import { extractEntitiesForMemories } from "./topicExtract";
import { type MemoryToVerify, verifyMemoriesForPublish } from "./verifySupport";

/**
 * Prompt-prefix stability for the memory portal calls.
 *
 * Extraction runs on every assistant turn, consolidation on every retained
 * candidate with similar neighbours, the injection classifier on every retain
 * that opts into it, the decay classifier once per borderline row of a sweep,
 * and topic extraction over every batch of a backfill — each one resending a
 * multi-thousand-character system prompt that never changes. The portal only
 * inserts explicit cache breakpoints for `anthropic/` models, so on the
 * open-weights models these steps actually use, the only thing that can
 * amortize that prompt is the provider's own IMPLICIT prefix cache, and an
 * implicit prefix cache hits only on a byte-identical leading run of tokens.
 *
 * Every one of those prompts satisfies that today by construction: the system
 * prompt is a module constant and every per-call byte lives in the user
 * message. Nothing enforced it, though — interpolating a count, an id, or a
 * timestamp into a system prompt is an easy and completely invisible way to
 * lose it, since the requests still succeed and the only symptom is a bill.
 * These tests pin the invariant rather than the wording: they compare two calls
 * to each other, so a sanctioned prompt edit passes untouched and only a
 * prefix-destroying change fails.
 */

interface CapturedRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
}

/** Capture every request body while returning a fixed valid completion. */
function capturingFetch(captured: CapturedRequest[], content: string): typeof fetch {
  return vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
    captured.push(JSON.parse(init.body as string) as CapturedRequest);
    return {
      ok: true,
      json: async () => ({ choices: [{ message: { content } }] }),
    };
  }) as unknown as typeof fetch;
}

function systemOf(req: CapturedRequest): string {
  const first = req.messages[0];
  expect(first.role).toBe("system");
  return first.content;
}

function userOf(req: CapturedRequest): string {
  return req.messages.find((m) => m.role === "user")?.content ?? "";
}

/** The longest common leading run of two strings — i.e. the bytes a prefix
 * cache could actually share between the two requests. */
function sharedPrefix(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(0, i);
}

describe("extractFacts prompt prefix", () => {
  // Fixtures use deliberately unusual names and ids: the containment
  // assertions below are only meaningful if the payload's tokens cannot also
  // occur inside the prompt's own worked examples.
  const messagesA = [
    { id: "msg_7f31", role: "user" as const, content: "I adopted a whippet named Quillbert." },
    { id: "msg_7f32", role: "assistant" as const, content: "Congrats! How old is he?" },
  ];
  const messagesB = [
    { id: "msg_c04a", role: "user" as const, content: "Signed a lease in Vantiscoro." },
  ];

  it("sends a byte-identical system message across calls with different transcripts and dates", async () => {
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, JSON.stringify({ candidates: [] }));
    // Local noon so the formatted calendar day is the same in every timezone.
    await extractFacts(messagesA, {
      apiKey: "k",
      fetchFn,
      now: new Date(2026, 2, 14, 12).getTime(),
    });
    await extractFacts(messagesB, {
      apiKey: "k",
      fetchFn,
      now: new Date(2026, 6, 2, 12).getTime(),
    });

    expect(captured).toHaveLength(2);
    expect(systemOf(captured[1])).toBe(systemOf(captured[0]));
  });

  it("keeps every per-call byte out of the system message", async () => {
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, JSON.stringify({ candidates: [] }));
    await extractFacts(messagesA, {
      apiKey: "k",
      fetchFn,
      now: new Date(2026, 2, 14, 12).getTime(),
    });

    const system = systemOf(captured[0]);
    expect(system).not.toContain("Quillbert");
    expect(system).not.toContain("msg_7f31");
    expect(system).not.toContain("2026-03-14");
  });

  it("sends exactly [system, user] so nothing precedes the static prompt", async () => {
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, JSON.stringify({ candidates: [] }));
    await extractFacts(messagesA, { apiKey: "k", fetchFn });

    expect(captured[0].messages.map((m) => m.role)).toEqual(["system", "user"]);
  });

  it("shares the whole user-message head, up to the transcript, on the same day", async () => {
    // The date anchor is the one sub-daily-variable element, and it leads the
    // user message — so within a calendar day the cacheable prefix extends past
    // the system prompt and through the anchor, breaking only at the
    // transcript. If the anchor ever moves after the transcript, this shrinks
    // to the system prompt alone.
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, JSON.stringify({ candidates: [] }));
    const now = new Date(2026, 2, 14, 12).getTime();
    await extractFacts(messagesA, { apiKey: "k", fetchFn, now });
    await extractFacts(messagesB, { apiKey: "k", fetchFn, now });

    const shared = sharedPrefix(userOf(captured[0]), userOf(captured[1]));
    expect(shared).toContain("Today's date is 2026-03-14");
    expect(shared).toContain("Recent conversation:\n");
  });

  it("orders the date anchor before the transcript", async () => {
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, JSON.stringify({ candidates: [] }));
    await extractFacts(messagesA, { apiKey: "k", fetchFn });

    const user = userOf(captured[0]);
    expect(user.indexOf("Today's date is")).toBeLessThan(user.indexOf("Recent conversation:"));
  });

  it("leaves the prefix intact on the anthropic path, where a prefill is appended last", async () => {
    // Anthropic models get an assistant `{` prefill to force JSON. It is
    // appended at the END, so it cannot displace the system message — but a
    // future change that prepended anything would silently break caching for
    // every provider at once.
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, JSON.stringify({ candidates: [] }));
    await extractFacts(messagesA, { apiKey: "k", fetchFn });
    await extractFacts(messagesA, { apiKey: "k", fetchFn, model: "anthropic/claude-sonnet-4-6" });

    const roles = captured[1].messages.map((m) => m.role);
    expect(roles[0]).toBe("system");
    expect(roles[roles.length - 1]).toBe("assistant");
    expect(systemOf(captured[1])).toBe(systemOf(captured[0]));
  });
});

describe("consolidateMemory prompt prefix", () => {
  const decision = JSON.stringify({ action: "create", content: "x" });

  it("sends a byte-identical system message across calls with different facts and candidates", async () => {
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, decision);
    await consolidateMemory(
      "Lives in Vantiscoro",
      [{ id: "mem_a41f", content: "Moved to Vantiscoro last spring", similarity: 0.83 }],
      { apiKey: "k", fetchFn }
    );
    await consolidateMemory(
      "Allergic to quillfish",
      [
        { id: "mem_b02c", content: "Avoids quillfish stew", similarity: 0.74 },
        { id: "mem_c19d", content: "Dislikes shellfish generally", similarity: 0.71 },
      ],
      { apiKey: "k", fetchFn }
    );

    expect(captured).toHaveLength(2);
    expect(systemOf(captured[1])).toBe(systemOf(captured[0]));
  });

  it("keeps candidate ids, contents and similarity scores out of the system message", async () => {
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, decision);
    await consolidateMemory(
      "Lives in Vantiscoro",
      [{ id: "mem_a41f", content: "Moved to Vantiscoro last spring", similarity: 0.83 }],
      { apiKey: "k", fetchFn }
    );

    const system = systemOf(captured[0]);
    expect(system).not.toContain("mem_a41f");
    expect(system).not.toContain("Vantiscoro");
    expect(system).not.toContain("0.83");
    expect(captured[0].messages.map((m) => m.role)).toEqual(["system", "user"]);
  });
});

describe("extractEntitiesForMemories prompt prefix", () => {
  const answer = JSON.stringify({ memories: [] });
  // 12 memories → two batches at the 10-per-call batch size, which is the case
  // that matters: a backfill's cost is dominated by the prefix it repeats.
  const many = Array.from({ length: 12 }, (_, i) => ({
    id: `mem_${i}`,
    content: `Memory number ${i} about something ${i} specific`,
  }));

  it("repeats a byte-identical system message across the batches of one sweep", async () => {
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, answer);
    await extractEntitiesForMemories(many, { apiKey: "k", fetchFn });

    expect(captured).toHaveLength(2);
    expect(systemOf(captured[1])).toBe(systemOf(captured[0]));
  });

  it("shares the vocabulary note across batches, extending the cacheable prefix past the system prompt", async () => {
    // The vocabulary note is per-sweep, not per-batch, and it leads the user
    // message — so a whole-vault backfill repeats it verbatim on every request
    // after the first. Moving it after the memory listing would cut the shared
    // run back to the system prompt alone.
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, answer);
    await extractEntitiesForMemories(many, {
      apiKey: "k",
      fetchFn,
      existingEntityNames: ["ZetaChain", "Blue Bottle on Valencia"],
    });

    const shared = sharedPrefix(userOf(captured[0]), userOf(captured[1]));
    expect(shared).toContain("The user's existing topics: ZetaChain, Blue Bottle on Valencia.");
    expect(shared).toContain("Memories:\n");
  });

  it("keeps memory ids and contents out of the system message", async () => {
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, answer);
    await extractEntitiesForMemories(many.slice(0, 2), {
      apiKey: "k",
      fetchFn,
      existingEntityNames: ["ZetaChain"],
    });

    const system = systemOf(captured[0]);
    expect(system).not.toContain("mem_0");
    expect(system).not.toContain("Memory number 0");
    expect(system).not.toContain("ZetaChain");
    expect(captured[0].messages.map((m) => m.role)).toEqual(["system", "user"]);
  });
});

describe("classifyInjectionCandidates prompt prefix", () => {
  const flagged = JSON.stringify({ poisoned: [] });
  const candidate = (content: string) => ({
    content,
    type: "other" as const,
    confidence: 0.9,
    sourceMessageIds: ["msg_7f31"],
    entities: [],
    eventTime: null,
    facetKey: null,
    facetValue: null,
  });

  it("sends a byte-identical system message across calls with different candidate counts", async () => {
    // Deliberately one candidate then two. The COUNT is the thing most likely
    // to be interpolated here ("classify the following N items") and it varies
    // on almost every turn, so it would cost the cache on every request while
    // reading as a harmless clarification.
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, flagged);
    await classifyInjectionCandidates([candidate("Lives in Vantiscoro")], {
      apiKey: "k",
      fetchFn,
    });
    await classifyInjectionCandidates(
      [candidate("Allergic to quillfish"), candidate("Trusts Quillbert Capital for advice")],
      { apiKey: "k", fetchFn }
    );

    expect(captured).toHaveLength(2);
    expect(systemOf(captured[1])).toBe(systemOf(captured[0]));
  });

  it("keeps the numbered candidate listing out of the system message", async () => {
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, flagged);
    await classifyInjectionCandidates(
      [candidate("Lives in Vantiscoro"), candidate("Allergic to quillfish")],
      { apiKey: "k", fetchFn }
    );

    const system = systemOf(captured[0]);
    expect(system).not.toContain("Vantiscoro");
    expect(system).not.toContain("quillfish");
    // The `[n] <content>` listing is the per-call payload — it belongs to the
    // user message, and folding it into the prompt would be the whole miss.
    expect(system).not.toContain("[1] ");
    expect(userOf(captured[0])).toContain("[1] Lives in Vantiscoro");
    expect(captured[0].messages.map((m) => m.role)).toEqual(["system", "user"]);
  });
});

describe("createLlmDecayClassifier prompt prefix", () => {
  const verdict = JSON.stringify({ verdict: "keep" });
  const NOW = Date.UTC(2026, 6, 1);
  const input = (overrides: Partial<DecayInput> = {}): DecayInput => ({
    id: "mem_a41f",
    factType: "other",
    eventTimeEnd: null,
    eventTimeKind: null,
    updatedAt: NOW - 100 * 24 * 60 * 60 * 1000,
    archivedAt: null,
    source: "auto-extracted",
    ...overrides,
  });

  it("sends a byte-identical system message across rows of one sweep", async () => {
    // A sweep is the highest-leverage case in the whole memory layer for a
    // stable prefix: one call per borderline row, all sharing this prompt.
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, verdict);
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      getContent: async (id) => `Content of ${id}`,
    });
    await classifier.classify(input(), "keep", NOW);
    await classifier.classify(
      input({ id: "mem_c19d", factType: "plan", updatedAt: NOW - 3 * 24 * 60 * 60 * 1000 }),
      "archive",
      NOW
    );

    expect(captured).toHaveLength(2);
    expect(systemOf(captured[1])).toBe(systemOf(captured[0]));
  });

  it("keeps the row's content and age metadata out of the system message", async () => {
    // Redaction off on purpose: it defaults ON here, and a redactor that ate
    // the distinctive token would make the containment assertion pass for the
    // wrong reason.
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, verdict);
    const classifier = createLlmDecayClassifier({
      apiKey: "k",
      fetchFn,
      piiRedaction: false,
      getContent: async () => "Was training for the Vantiscoro marathon",
    });
    await classifier.classify(input(), "keep", NOW);

    const system = systemOf(captured[0]);
    expect(system).not.toContain("Vantiscoro");
    expect(system).not.toContain("mem_a41f");
    expect(system).not.toContain("ageDays");
    expect(captured[0].messages.map((m) => m.role)).toEqual(["system", "user"]);
  });
});

describe("verifyMemoriesForPublish prompt prefix", () => {
  const affirmed = JSON.stringify({ supported: [] });
  const sources = { getSourceText: async (id: string) => `user: message ${id}` };
  const memory = (uniqueId: string, content: string): MemoryToVerify => ({
    uniqueId,
    content,
    source: "auto-extracted",
    sourceChunkIds: [`msg_${uniqueId}`],
  });

  it("sends a byte-identical system message across calls with different batch sizes", async () => {
    // One memory then two. A publish batch's size varies per publish, so an
    // interpolated count would cost the cache on every call while reading as a
    // harmless clarification.
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, affirmed);
    await verifyMemoriesForPublish([memory("a41f", "Lives in Vantiscoro")], sources, {
      apiKey: "k",
      fetchFn,
    });
    await verifyMemoriesForPublish(
      [memory("b72c", "Allergic to quillfish"), memory("c93d", "Owns a whippet named Quillbert")],
      sources,
      { apiKey: "k", fetchFn }
    );

    expect(captured).toHaveLength(2);
    expect(systemOf(captured[1])).toBe(systemOf(captured[0]));
  });

  it("keeps the numbered fact and evidence listing out of the system message", async () => {
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, affirmed);
    await verifyMemoriesForPublish(
      [memory("a41f", "Lives in Vantiscoro"), memory("b72c", "Allergic to quillfish")],
      sources,
      { apiKey: "k", fetchFn }
    );

    const system = systemOf(captured[0]);
    expect(system).not.toContain("Vantiscoro");
    expect(system).not.toContain("quillfish");
    // Both halves of the payload — the fact AND its evidence — belong to the
    // user message. Evidence is the bigger risk here than in the other callers:
    // it is the largest per-call block, so folding it into the prompt would be
    // the most expensive version of this mistake.
    expect(system).not.toContain("[1] FACT:");
    expect(system).not.toContain("msg_a41f");
    expect(userOf(captured[0])).toContain("[1] FACT: Lives in Vantiscoro");
    expect(userOf(captured[0])).toContain("user: message msg_a41f");
  });
});

/**
 * Everything above runs inside one module instantiation, and a prompt built at
 * LOAD time — a module-level template literal that interpolates, say, the
 * current timestamp — looks perfectly constant to those tests, because the
 * process evaluates it exactly once. In production that is the worse of the two
 * failure modes: every client process (and every serverless instance) gets its
 * own prefix, so the fleet shares no cacheable bytes at all while a single run
 * looks clean. Re-importing the module is the only way to see it, so each
 * prompt gets one reload check.
 *
 * The reload alone isn't enough either. Both evaluations happen milliseconds
 * apart, so a prompt interpolating a COARSE clock reading — a formatted
 * calendar date rather than a raw timestamp — reloads to the identical string
 * and slips through, while in production the fleet's prefix rotates at every
 * midnight and differs between clients in different timezones. So the two
 * evaluations are done under two deliberately distant system clocks; the pair
 * below differ in day, month and year, which covers every granularity anyone
 * would plausibly interpolate.
 */
describe("system prompts are identical across module instantiations", () => {
  // Local noon on each, so the formatted calendar day is the same in every
  // timezone the suite might run in.
  const DAY_ONE = new Date(2025, 10, 5, 12).getTime();
  const DAY_TWO = new Date(2026, 5, 17, 12).getTime();

  beforeEach(() => {
    // Fake ONLY Date. `portalLlm` arms a real `setTimeout` for its abort
    // controller and clears it on the way out; faking timers wholesale would
    // leave that pending and the abort would never be scheduled against a clock
    // anyone advances.
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    // The reloads leave the registry holding instances that were evaluated
    // under a fake clock. Nothing later in this file imports them today, but
    // drop them so that stays true.
    vi.resetModules();
  });

  const captureAcrossReload = async (
    call: (mod: unknown, fetchFn: typeof fetch) => Promise<unknown>,
    specifier: string,
    completion: string
  ): Promise<[string, string]> => {
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, completion);
    // Reset before the FIRST import too: the file's static imports already
    // evaluated these modules at real time, and we want both evaluations under
    // a clock we control.
    vi.resetModules();
    vi.setSystemTime(DAY_ONE);
    await call(await import(/* @vite-ignore */ specifier), fetchFn);
    vi.resetModules();
    vi.setSystemTime(DAY_TWO);
    await call(await import(/* @vite-ignore */ specifier), fetchFn);
    expect(captured).toHaveLength(2);
    return [systemOf(captured[0]), systemOf(captured[1])];
  };

  it("holds for extraction", async () => {
    const [before, after] = await captureAcrossReload(
      (mod, fetchFn) =>
        (mod as typeof import("./autoExtract")).extractFacts(
          [{ id: "msg_7f31", role: "user", content: "I adopted a whippet named Quillbert." }],
          { apiKey: "k", fetchFn }
        ),
      "./autoExtract",
      JSON.stringify({ candidates: [] })
    );
    expect(after).toBe(before);
  });

  it("holds for consolidation", async () => {
    const [before, after] = await captureAcrossReload(
      (mod, fetchFn) =>
        (mod as typeof import("./consolidate")).consolidateMemory(
          "Lives in Vantiscoro",
          [{ id: "mem_a41f", content: "Moved to Vantiscoro last spring", similarity: 0.83 }],
          { apiKey: "k", fetchFn }
        ),
      "./consolidate",
      JSON.stringify({ action: "create", content: "x" })
    );
    expect(after).toBe(before);
  });

  it("holds for topic extraction", async () => {
    const [before, after] = await captureAcrossReload(
      (mod, fetchFn) =>
        (mod as typeof import("./topicExtract")).extractEntitiesForMemories(
          [{ id: "mem_0", content: "Rides a whippet-shaped bicycle" }],
          { apiKey: "k", fetchFn }
        ),
      "./topicExtract",
      JSON.stringify({ memories: [] })
    );
    expect(after).toBe(before);
  });

  it("holds for the injection classifier", async () => {
    const [before, after] = await captureAcrossReload(
      (mod, fetchFn) =>
        (mod as typeof import("./injectionClassifier")).classifyInjectionCandidates(
          [
            {
              content: "Lives in Vantiscoro",
              type: "other",
              confidence: 0.9,
              sourceMessageIds: ["msg_7f31"],
              entities: [],
              eventTime: null,
              facetKey: null,
              facetValue: null,
            },
          ],
          { apiKey: "k", fetchFn }
        ),
      "./injectionClassifier",
      JSON.stringify({ poisoned: [] })
    );
    expect(after).toBe(before);
  });

  it("holds for the decay classifier", async () => {
    const now = Date.UTC(2026, 6, 1);
    const [before, after] = await captureAcrossReload(
      // `classify` returns `DecayVerdict | Promise<DecayVerdict>` — it short-circuits
      // synchronously when no LLM call is needed — so normalize to a promise.
      (mod, fetchFn) =>
        Promise.resolve(
          (mod as typeof import("./decayClassifier"))
            .createLlmDecayClassifier({
              apiKey: "k",
              fetchFn,
              getContent: async () => "Was training for the Vantiscoro marathon",
            })
            .classify(
              {
                id: "mem_a41f",
                factType: "other",
                eventTimeEnd: null,
                eventTimeKind: null,
                updatedAt: now - 100 * 24 * 60 * 60 * 1000,
                archivedAt: null,
                source: "auto-extracted",
              },
              "keep",
              now
            )
        ),
      "./decayClassifier",
      JSON.stringify({ verdict: "keep" })
    );
    expect(after).toBe(before);
  });
  it("holds for publish verification", async () => {
    const [before, after] = await captureAcrossReload(
      (mod, fetchFn) =>
        (mod as typeof import("./verifySupport")).verifyMemoriesForPublish(
          [
            {
              uniqueId: "mem_a41f",
              content: "Lives in Vantiscoro",
              source: "auto-extracted",
              sourceChunkIds: ["msg_7f31"],
            },
          ],
          { getSourceText: async () => "user: I moved to Vantiscoro last spring" },
          { apiKey: "k", fetchFn }
        ),
      "./verifySupport",
      JSON.stringify({ supported: [1] })
    );
    expect(after).toBe(before);
  });
});
