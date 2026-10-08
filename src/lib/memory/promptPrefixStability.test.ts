import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { extractFacts } from "./autoExtract";
import { consolidateMemory } from "./consolidate";
import type { DecayInput } from "./decay";
import { createLlmDecayClassifier } from "./decayClassifier";
import { classifyInjectionCandidates } from "./injectionClassifier";
import { extractEntitiesForMemories } from "./topicExtract";
import { type MemoryToVerify, verifyMemoriesForPublish } from "./verifySupport";

interface CapturedRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
}

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

function sharedPrefix(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(0, i);
}

describe("extractFacts prompt prefix", () => {
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
  });

  it("sends a byte-identical system message across calls with different candidate counts", async () => {
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
    expect(system).not.toContain("[1] FACT:");
    expect(system).not.toContain("msg_a41f");
    expect(userOf(captured[0])).toContain("[1] FACT: Lives in Vantiscoro");
    expect(userOf(captured[0])).toContain("user: message msg_a41f");
  });
});

describe("system prompts are identical across module instantiations", () => {
  const DAY_ONE = new Date(2025, 10, 5, 12).getTime();
  const DAY_TWO = new Date(2026, 5, 17, 12).getTime();

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
  });

  const captureAcrossReload = async (
    call: (mod: unknown, fetchFn: typeof fetch) => Promise<unknown>,
    specifier: string,
    completion: string
  ): Promise<[string, string]> => {
    const captured: CapturedRequest[] = [];
    const fetchFn = capturingFetch(captured, completion);
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
