/**
 * Profile-facet synthesis, asserted ON THE WIRE.
 *
 * A separate file from synthesizeProfile.test.ts on purpose: that suite stubs
 * `reflect` so it can drive the delta/gating logic, which means it can only ever
 * see the ARGUMENTS the facet path passes. The two properties here are about the
 * request that actually leaves — the `X-Anuma-Task-Type` header and the bytes of
 * the `role:system` message — so reflect has to run for real and only the layers
 * below/around it (recall, the vault snapshot, embeddings) are stubbed.
 */
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

/**
 * Two facets that share a response schema, so the JSON-Schema tail reflect
 * appends (the synthesis model can't take `response_format`) is identical for
 * both — any remaining difference between their system messages would then be
 * facet data still living in the system half, which is exactly what the move
 * removed. `work_role`/`interests` would have differed by their schema alone and
 * proved nothing.
 */
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

/** One captured `role:system` / `role:user` turn per outgoing request. */
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
  // The portal picks its registered `memory_profile_synth` prompt off this header
  // alone. Nothing else in the response changes when it is missing — the profile
  // still synthesizes — so a dropped header is invisible to every other test.
  // reflect() takes the name per call precisely so this flow can declare one
  // without the user-facing reflect path declaring anything.
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

  // The registered copy is matched by strings.Contains against the system message,
  // so a facet value interpolated back into the system half breaks the match and
  // the portal appends a SECOND, differently-worded instruction block to every
  // request. Label, guidance and the structured-response hint were all in there;
  // they now ride the user turn, so two facets must send the same system bytes.
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
    // Still a marked internal flow — reflect doesn't mark, so this prompt must.
    expect(turns[0].system).toContain(INTERNAL_FLOW_MARKER);
    for (const [i, turn] of turns.entries()) {
      const facet = FACETS[i];
      expect(turn.system).not.toContain(facet.label);
      expect(turn.system).not.toContain(facet.guidance);
      // …and all of it still reaches the model, one turn over.
      expect(turn.user).toContain(facet.label);
      expect(turn.user).toContain(facet.guidance);
      // The evidence block stays last: the model cites it back by index, so the
      // facet instruction has to sit ahead of it, not after.
      expect(turn.user.indexOf(facet.guidance)).toBeLessThan(
        turn.user.indexOf("Memories (use only these as evidence):")
      );
    }
  });
});
