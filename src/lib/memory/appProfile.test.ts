import { createHash } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import type { DecayCandidateRaw } from "../db/memoryVault/operations";
import { type MemoryAppProfile, ZETALABS_MARKETS_PROFILE } from "./appProfile";
import { extractFacts } from "./autoExtract";
import { assembleMemoryContext } from "./context";
import { classifyDecay, SHORT_TTL_MS } from "./decay";
import { createDecaySweeperOver, type DecaySweepBackend } from "./decayWorker";
import { recall } from "./recall";
import type { RecallContext, RecallDiagnostics, RecallFactSource, RecallResult } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 10, 27);
const DEFAULT_SYSTEM_PROMPT_SHA256 =
  "5dd8ff0d149c215b5f1929a945a47939983f1d7266a8ad1558d0ec758d39505f";

function completionFetch(content: string, systems: string[] = []): typeof fetch {
  return vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string) as {
      messages?: Array<{ role: string; content: string }>;
      input?: Array<{ role: string; content: string }>;
    };
    systems.push((body.messages ?? body.input ?? [])[0].content);
    return { ok: true, json: async () => ({ choices: [{ message: { content } }] }) };
  }) as unknown as typeof fetch;
}

const MESSAGES = [{ id: "m1", role: "user" as const, content: "I'm long 2.5 ETH perp at 5x." }];

async function systemPromptFor(profile?: MemoryAppProfile): Promise<string> {
  const systems: string[] = [];
  await extractFacts(MESSAGES, {
    apiKey: "k",
    fetchFn: completionFetch(JSON.stringify({ candidates: [] }), systems),
    ...(profile && { profile }),
  });
  return systems[0];
}

function candidateOfLength(length: number): string {
  const prefix = "Long 2.5 ETH perp on Hyperliquid at 5x, entered at $3,150 on 2026-11-20; ";
  return prefix + "x".repeat(length - prefix.length);
}

async function extractContents(length: number, profile?: MemoryAppProfile): Promise<string[]> {
  const candidates = await extractFacts(MESSAGES, {
    apiKey: "k",
    fetchFn: completionFetch(
      JSON.stringify({
        candidates: [
          {
            content: candidateOfLength(length),
            type: "ongoing_context",
            confidence: 0.9,
            sourceMessageIds: ["m1"],
          },
        ],
      })
    ),
    ...(profile && { profile }),
  });
  return candidates.map((c) => c.content);
}

describe("extraction prompt composition", () => {
  it("sends the unchanged default system prompt when no profile is passed", async () => {
    const system = await systemPromptFor();
    expect(createHash("sha256").update(system).digest("hex")).toBe(DEFAULT_SYSTEM_PROMPT_SHA256);
  });

  it("sends the default system prompt for a profile without extraction settings", async () => {
    expect(await systemPromptFor({ id: "plain" })).toBe(await systemPromptFor());
  });

  it("appends the profile guidance and content cap after the default prompt", async () => {
    const base = await systemPromptFor();
    const system = await systemPromptFor(ZETALABS_MARKETS_PROFILE);
    expect(system.startsWith(base)).toBe(true);
    expect(system).toContain(ZETALABS_MARKETS_PROFILE.extractionGuidance);
    expect(system).toContain("up to 320 characters");
    expect(system.endsWith("Output strict JSON matching the schema. No prose.")).toBe(true);
  });
});

describe("extraction content cap", () => {
  it("keeps the 200-character cap without a profile", async () => {
    expect(await extractContents(200)).toHaveLength(1);
    expect(await extractContents(201)).toHaveLength(0);
  });

  it("uses the profile cap when one is set", async () => {
    expect(await extractContents(320, ZETALABS_MARKETS_PROFILE)).toHaveLength(1);
    expect(await extractContents(321, ZETALABS_MARKETS_PROFILE)).toHaveLength(0);
  });

  it("applies the profile cap after PII restoration", async () => {
    const candidates = await extractFacts(MESSAGES, {
      apiKey: "k",
      piiRedaction: true,
      profile: ZETALABS_MARKETS_PROFILE,
      fetchFn: completionFetch(
        JSON.stringify({
          candidates: [
            {
              content: candidateOfLength(250),
              type: "ongoing_context",
              confidence: 0.9,
              sourceMessageIds: ["m1"],
            },
          ],
        })
      ),
    });
    expect(candidates).toHaveLength(1);
  });
});

describe("ZetaLabs markets profile", () => {
  const guidance = ZETALABS_MARKETS_PROFILE.extractionGuidance ?? "";

  it.each([
    ["Holdings and open positions", "ongoing_context"],
    ["Entries, exits and resizes", "ongoing_context"],
    ["Watchlists", "ongoing_context"],
    ["Theses and directional views", "plan"],
    ["Planned entries, exits, targets and stops", "plan"],
    ["Risk limits and rules", "constraint"],
    ["Preferred venues, chains, wallets and instruments", "preference"],
    ["Standing instructions about how to present analysis", "instruction"],
  ])("maps %s to %s", (category, type) => {
    const line = guidance.split("\n").find((l) => l.startsWith(`- ${category}`));
    expect(line).toContain(`→ type "${type}"`);
  });

  it("tells the extractor what not to store", () => {
    expect(guidance).toContain("came from the assistant or a tool");
    expect(guidance).toContain("One-off lookups");
    expect(guidance).toContain("pasted or quoted third-party text");
  });

  it("leaves ranking weights and the recall floor at their defaults", () => {
    expect(ZETALABS_MARKETS_PROFILE.factTypeWeights).toBeUndefined();
    expect(ZETALABS_MARKETS_PROFILE.factMinScore).toBeUndefined();
  });
});

describe("profile decay TTLs", () => {
  const row = (factType: string, quietDays: number, eventTimeEnd: number | null = null) => ({
    factType,
    eventTimeEnd,
    eventTimeKind: eventTimeEnd === null ? null : "range",
    updatedAt: NOW - quietDays * DAY_MS,
    archivedAt: null,
    source: "auto-extracted",
  });
  const policy = { ttlByType: ZETALABS_MARKETS_PROFILE.ttlByType as Record<string, number> };

  it("keeps an open position past 30 quiet days and archives it after 180", () => {
    expect(classifyDecay(row("ongoing_context", 60), NOW)).toBe("archive");
    expect(classifyDecay(row("ongoing_context", 60), NOW, policy)).toBe("keep");
    expect(classifyDecay(row("ongoing_context", 181), NOW, policy)).toBe("archive");
  });

  it("keeps a thesis for 90 quiet days, or until its horizon has passed", () => {
    expect(classifyDecay(row("plan", 60), NOW, policy)).toBe("keep");
    expect(classifyDecay(row("plan", 91), NOW, policy)).toBe("archive");
    expect(classifyDecay(row("plan", 200, NOW + 30 * DAY_MS), NOW, policy)).toBe("keep");
    expect(classifyDecay(row("plan", 5, NOW - 8 * DAY_MS), NOW, policy)).toBe("archive");
  });

  function sweepBackend(candidates: DecayCandidateRaw[]): {
    backend: DecaySweepBackend;
    archived: string[];
  } {
    const archived: string[] = [];
    return {
      archived,
      backend: {
        candidates: async () => candidates,
        archive: async (rows) => {
          archived.push(...rows.map((r) => r.uniqueId));
          return new Set(rows.map((r) => r.uniqueId));
        },
        hardDelete: async () => new Set<string>(),
      },
    };
  }
  const position: DecayCandidateRaw = {
    uniqueId: "position",
    ...row("ongoing_context", 60),
    trustTier: "trusted",
  };

  it("archives a 60-day-quiet position in a sweep without a profile", async () => {
    const { backend, archived } = sweepBackend([position]);
    await createDecaySweeperOver(backend, { now: NOW }).runSweep();
    expect(archived).toEqual(["position"]);
  });

  it("keeps the same position in a sweep given the profile", async () => {
    const { backend, archived } = sweepBackend([position]);
    await createDecaySweeperOver(backend, {
      now: NOW,
      profile: ZETALABS_MARKETS_PROFILE,
    }).runSweep();
    expect(archived).toEqual([]);
  });

  it("lets an explicit policy entry win over the profile", async () => {
    const { backend, archived } = sweepBackend([position]);
    await createDecaySweeperOver(backend, {
      now: NOW,
      profile: ZETALABS_MARKETS_PROFILE,
      policy: { ttlByType: { ongoing_context: SHORT_TTL_MS } },
    }).runSweep();
    expect(archived).toEqual(["position"]);
  });
});

describe("profile recall settings", () => {
  function factSourceReturning(
    scoreScale?: "cosine" | "rrf" | "bm25"
  ): RecallFactSource & { search: ReturnType<typeof vi.fn> } {
    const search = vi.fn(async () => ({
      results: [
        { uniqueId: "a", content: "Long 2.5 ETH perp", similarity: 0.04 },
        { uniqueId: "b", content: "Watching HYPE", similarity: 0.02 },
      ],
      vaultSize: 2,
      reranked: false,
      rerankMs: 0,
      hadV2Head: true,
      embeddingsUnavailable: false,
      rankedOnCosine: true,
      decryptLast: false,
      rowsDecrypted: 2,
      queryEmbedMs: 0,
      rowsEmbedded: 0,
      ...(scoreScale && { scoreScale }),
    }));
    return {
      search,
      graphRanking: async () => [],
      temporalRanking: async () => [],
    } as unknown as RecallFactSource & { search: ReturnType<typeof vi.fn> };
  }
  const ctxFor = (factSource: RecallFactSource): RecallContext => ({
    factSource,
    embeddingOptions: { apiKey: "k" },
  });
  const profile: MemoryAppProfile = {
    id: "tuned",
    factMinScore: 0.25,
    factTypeWeights: { constraint: 1.5 },
  };

  it("uses the default floor and no weights without a profile", async () => {
    const source = factSourceReturning();
    await recall("my ETH position", ctxFor(source));
    expect(source.search.mock.calls[0][1]).toMatchObject({ minSimilarity: 0.1 });
    expect(source.search.mock.calls[0][1]).not.toHaveProperty("factTypeWeights");
  });

  it("applies the profile floor and fact-type weights to the fact lane", async () => {
    const source = factSourceReturning();
    const seen: RecallDiagnostics[] = [];
    await recall("my ETH position", ctxFor(source), {
      profile,
      onDiagnostics: (d) => seen.push(d),
    });
    expect(source.search.mock.calls[0][1]).toMatchObject({
      minSimilarity: 0.25,
      factTypeWeights: { constraint: 1.5 },
    });
    expect(seen[0].minScoreApplied).toBe(0.25);
  });

  it("lets explicit recall options win over the profile", async () => {
    const source = factSourceReturning();
    await recall("my ETH position", ctxFor(source), {
      profile,
      minScore: 0.4,
      factTypeWeights: { plan: 2 },
    });
    expect(source.search.mock.calls[0][1]).toMatchObject({
      minSimilarity: 0.4,
      factTypeWeights: { plan: 2 },
    });
  });

  it.each(["cosine", "rrf", "bm25"] as const)(
    "reports the %s score scale the fact lane ranked on",
    async (scale) => {
      const seen: RecallDiagnostics[] = [];
      await recall("my ETH position", ctxFor(factSourceReturning(scale)), {
        onDiagnostics: (d) => seen.push(d),
      });
      expect(seen[0]).toMatchObject({ scoreScale: scale, topScore: 0.04 });
    }
  );

  it("reports an unknown scale for a fact source that does not state one", async () => {
    const seen: RecallDiagnostics[] = [];
    await recall("my ETH position", ctxFor(factSourceReturning()), {
      onDiagnostics: (d) => seen.push(d),
    });
    expect(seen[0].scoreScale).toBe("unknown");
  });

  it("passes the profile from context assembly into recall", async () => {
    const empty: RecallResult = {
      memories: [],
      candidateCount: 0,
      usedBudget: "low",
      reranked: false,
    };
    const recallFn = vi.fn().mockResolvedValue(empty);
    await assembleMemoryContext({ query: "What is my ETH position?", recall: recallFn, profile });
    expect(recallFn.mock.calls.map((call) => call[1].profile)).toEqual([profile, profile]);
    expect(recallFn.mock.calls.map((call) => call[1].minScore)).toEqual([undefined, 0.5]);
  });
});
