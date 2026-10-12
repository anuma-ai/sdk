import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./recall.js", () => ({ recall: vi.fn() }));
vi.mock("../db/memoryVault/operations.js", () => ({ getAllVaultMemoriesOp: vi.fn() }));
vi.mock("../memoryEngine/embeddings.js", () => ({ generateEmbeddings: vi.fn() }));

import { getAllVaultMemoriesOp } from "../db/memoryVault/operations.js";
import { INTERNAL_FLOW_MARKER } from "../internalFlowMarker.js";
import { generateEmbeddings } from "../memoryEngine/embeddings.js";
import { recall } from "./recall.js";
import { type ProfileFacet, synthesizeProfile } from "./synthesizeProfile.js";
import type { RankedMemory, RecallContext } from "./types.js";

const mockRecall = vi.mocked(recall);
const mockGetAll = vi.mocked(getAllVaultMemoriesOp);
const mockEmbed = vi.mocked(generateEmbeddings);

const ctx = {
  embeddingOptions: { apiKey: "k" },
  vaultCtx: {},
  vaultCache: new Map(),
} as unknown as RecallContext;

const FACETS: ProfileFacet[] = [
  { key: "bio", label: "Bio", query: "who is this person", guidance: "Write a short bio." },
  {
    key: "location_context",
    label: "Location",
    query: "where do they live",
    guidance: "Name the city and how long they have been there.",
  },
];

const ranked: RankedMemory = {
  id: "a",
  kind: "fact",
  content: "content a",
  score: 0.9,
  createdAt: new Date(500),
  updatedAt: new Date(1000),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAll.mockResolvedValue([]);
  mockEmbed.mockResolvedValue([]);
  mockRecall.mockResolvedValue({
    memories: [ranked],
    usedBudget: "low" as const,
    reranked: false,
    candidateCount: 1,
  });
});

function turnsOf(fetchFn: ReturnType<typeof vi.fn>) {
  return fetchFn.mock.calls.map((call) => {
    const init = call[1] as RequestInit;
    const messages = JSON.parse(init.body as string).messages as Array<{
      role: string;
      content: string;
    }>;
    return {
      headers: init.headers as Record<string, string>,
      system: messages.find((m) => m.role === "system")!.content,
      user: messages.find((m) => m.role === "user")!.content,
    };
  });
}

describe("synthesizeProfile — what facet synthesis puts on the wire", () => {
  it("declares memory_profile_synth on every facet request", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: "s", hasEvidence: true }) } }],
      }),
    });
    await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: FACETS,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    const turns = turnsOf(fetchFn);
    expect(turns).toHaveLength(FACETS.length);
    for (const turn of turns) {
      expect(turn.headers["X-Anuma-Task-Type"]).toBe("memory_profile_synth");
    }
  });

  it("sends one fixed system prompt for every facet, with the facet data on the user turn", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({ summary: "s", hasEvidence: true }) } }],
      }),
    });
    await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: FACETS,
      fetchFn: fetchFn as unknown as typeof fetch,
    });

    const turns = turnsOf(fetchFn);
    expect(turns[0].system).toBe(turns[1].system);
    expect(turns[0].system).toContain(INTERNAL_FLOW_MARKER);
    for (const [i, turn] of turns.entries()) {
      const facet = FACETS[i];
      expect(turn.system).not.toContain(facet.label);
      expect(turn.system).not.toContain(facet.guidance);
      expect(turn.user).toContain(facet.label);
      expect(turn.user).toContain(facet.guidance);
      expect(turn.user.indexOf(facet.guidance)).toBeLessThan(
        turn.user.indexOf("Memories (use only these as evidence):")
      );
    }
  });
});
