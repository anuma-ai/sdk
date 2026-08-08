import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./reflect.js", () => ({ reflect: vi.fn() }));
vi.mock("./recall.js", () => ({ recall: vi.fn() }));
vi.mock("../db/memoryVault/operations.js", () => ({ getAllVaultMemoriesOp: vi.fn() }));
vi.mock("../memoryEngine/embeddings.js", () => ({ generateEmbeddings: vi.fn() }));

import { getAllVaultMemoriesOp } from "../db/memoryVault/operations.js";
import type { StoredVaultMemory } from "../db/memoryVault/types.js";
import { generateEmbeddings } from "../memoryEngine/embeddings.js";
import {
  DEFAULT_PROFILE_FACT_TYPE_WEIGHTS,
  DEFAULT_PROFILE_PROOF_ALPHA,
} from "./profileSalience.js";
import { recall } from "./recall.js";
import { RECALL_MAX_LIMIT } from "./recallConstants.js";
import { INTERNAL_FLOW_MARKER } from "../internalFlowMarker.js";
import { reflect } from "./reflect.js";
import {
  facetsSignature,
  type ProfileConfigFingerprint,
  type ProfileDoc,
  type ProfileFacet,
  type ProfileFacetKey,
  type ProfileSection,
  PROFILE_DOC_VERSION,
  synthesizeProfile,
} from "./synthesizeProfile.js";
import type { RankedMemory, RecallContext } from "./types.js";

const mockReflect = vi.mocked(reflect);
const mockRecall = vi.mocked(recall);
const mockGetAll = vi.mocked(getAllVaultMemoriesOp);
const mockEmbed = vi.mocked(generateEmbeddings);

// vaultCtx/vaultCache just need to be truthy — the ops + reflect are mocked.
const ctx = {
  embeddingOptions: { apiKey: "k" },
  vaultCtx: {},
  vaultCache: new Map(),
} as unknown as RecallContext;

const FACETS: ProfileFacet[] = [
  { key: "bio", label: "Bio", query: "who", guidance: "g" },
  { key: "interests", label: "Interests", query: "what", guidance: "g" },
];

/** The other column-backed facet. Not in FACETS — most tests don't need it. */
const WORK_ROLE: ProfileFacet = {
  key: "work_role",
  label: "Work & Role",
  query: "work",
  guidance: "g",
};

const LABELS: Record<ProfileFacetKey, string> = {
  bio: "Bio",
  interests: "Interests",
  work_role: "Work & Role",
  location_context: "Location",
  communication_style: "Communication Style",
  recent_activity: "Recently",
};

/** The config fingerprint a given facet set + default scopes produce. */
function fingerprint(
  facets: ProfileFacet[],
  redacted = false,
  reviewedMemoryIds: readonly string[] = []
): ProfileConfigFingerprint {
  return {
    facetKeys: facets.map((f) => f.key).sort(),
    // The real algorithm, not a mirror: it folds in each facet's response
    // schema, which is module-private, so a hand-copied formula would rot into
    // silent "everything regenerates" noise. The pre-schema formula is asserted
    // directly in the invalidation test below.
    facetsSignature: facetsSignature(facets),
    scopes: ["private"],
    redacted,
    reviewedMemoryIdsSignature: [...new Set(reviewedMemoryIds)].sort().join("\n"),
  };
}

/** The config fingerprint FACETS + default scopes produce (unredacted). */
function cfg(redacted = false): ProfileConfigFingerprint {
  return fingerprint(FACETS, redacted);
}

function mem(id: string, opts: Partial<StoredVaultMemory> = {}): StoredVaultMemory {
  return {
    uniqueId: id,
    content: `content ${id}`,
    scope: "private",
    folderId: null,
    userId: null,
    embedding: null,
    embeddingModel: null,
    sourceChunkIds: null,
    proofCount: 1,
    source: "manual",
    eventTimeStart: null,
    eventTimeEnd: null,
    eventTimeKind: null,
    topicsUserManaged: false,
    topicsExtractedAt: null,
    topicsExtractedVersion: null,
    supersededBy: null,
    supersededAt: null,
    lastObservedAt: null,
    factType: null,
    archivedAt: null,
    trustTier: null,
    topics: null,
    topicsUpdatedAt: null,
    visibility: "private",
    twinOptIn: false,
    publishedAt: null,
    geohash: null,
    facetKey: null,
    facetValue: null,
    createdAt: opts.createdAt ?? new Date(500),
    updatedAt: opts.updatedAt ?? new Date(1000),
    isDeleted: false,
    ...opts,
  };
}

function ranked(id: string): RankedMemory {
  return {
    id,
    kind: "fact",
    content: `content ${id}`,
    score: 0.9,
    createdAt: new Date(500),
    updatedAt: new Date(1000),
  };
}

/** Default recall mock: return one fact so reflect stubs still see evidence. */
function stubRecallForReflect() {
  mockRecall.mockResolvedValue({
    memories: [ranked("a")],
    usedBudget: "low" as const,
    reranked: false,
    candidateCount: 1,
  });
}

/** `extra` carries the structured attributes a column-backed facet emits
 * (`occupation` / `interests`) — or deliberate garbage, to drive the tolerant
 * parse paths. */
function reflectResult(
  summary: string,
  memoryIds: string[],
  hasEvidence = true,
  extra: Record<string, unknown> = {}
) {
  return {
    text: summary,
    structuredOutput: { summary, hasEvidence, ...extra },
    basedOn: { memoryIds },
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };
}

function section(key: ProfileFacetKey, text: string, ids: string[]): ProfileSection {
  return {
    key,
    label: LABELS[key],
    text,
    sourceMemoryIds: ids,
    generatedAt: 1,
  };
}

function priorDoc(sections: ProfileSection[], watermark: number, config = cfg()): ProfileDoc {
  return {
    version: PROFILE_DOC_VERSION,
    sections,
    vaultWatermark: watermark,
    config,
    observationTrends: { new: 0, strengthening: 0, stable: 0, weakening: 0, stale: 0 },
    generatedAt: 1,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Facet path now recalls first; default empty so tests that only stub
  // reflect still get a legitimate-empty section unless they stub recall.
  stubRecallForReflect();
});

describe("synthesizeProfile", () => {
  it("throws without a vault context", async () => {
    await expect(
      synthesizeProfile({ embeddingOptions: { apiKey: "k" } } as RecallContext)
    ).rejects.toThrow(/vaultCtx/);
  });

  it("throws without a vault cache (semantic fact lane would be dead)", async () => {
    await expect(
      synthesizeProfile({ embeddingOptions: { apiKey: "k" }, vaultCtx: {} } as RecallContext)
    ).rejects.toThrow(/vaultCache/);
  });

  it("synthesizes one section per facet, carrying source ids + watermark + config", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(3000) })]);
    mockRecall
      .mockResolvedValueOnce({
        memories: [ranked("a")],
        usedBudget: "low",
        reranked: false,
        candidateCount: 1,
      })
      .mockResolvedValueOnce({
        memories: [ranked("a")],
        usedBudget: "low",
        reranked: false,
        candidateCount: 1,
      });
    mockReflect
      .mockResolvedValueOnce(reflectResult("A bio", ["a"]))
      .mockResolvedValueOnce(reflectResult("Some interests", ["a"]));

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS });

    // Profile synthesis is a background op that reaches the portal through reflect(),
    // which is NOT marked itself (it also serves the user's own questions). So the
    // marker has to ride the facet prompt — without it these calls read as markerless
    // and get 4xx'd once PORTAL_DETECTION_REJECT_MARKERLESS is on.
    for (const call of mockReflect.mock.calls) {
      expect(call[2]?.systemPrompt).toContain(INTERNAL_FLOW_MARKER);
    }

    expect(doc.version).toBe(PROFILE_DOC_VERSION);
    expect(doc.sections.map((s) => s.key)).toEqual(["bio", "interests"]);
    expect(doc.sections[0].text).toBe("A bio");
    expect(doc.sections[0].sourceMemoryIds).toEqual(["a"]);
    expect(doc.vaultWatermark).toBe(3000);
    expect(doc.config).toEqual(cfg(false));
    // createdAt=500ms epoch → long-quiet → stale (C2)
    expect(doc.observationTrends).toEqual({
      new: 0,
      strengthening: 0,
      stable: 0,
      weakening: 0,
      stale: 1,
    });
    expect(mockRecall).toHaveBeenCalledTimes(2);
    expect(mockReflect).toHaveBeenCalledTimes(2);
    // Profile-worthiness knobs on facet recall (not global chat defaults).
    expect(mockRecall.mock.calls[0][2]).toMatchObject({
      factTypeWeights: DEFAULT_PROFILE_FACT_TYPE_WEIGHTS,
      proofCountAlpha: DEFAULT_PROFILE_PROOF_ALPHA,
      types: ["fact"],
    });
    // Reflect receives the recalled set via memories override.
    expect(mockReflect.mock.calls[0][2]).toMatchObject({
      memories: [expect.objectContaining({ id: "a" })],
    });
    // The snapshot is scoped to the same scopes synthesis recalls from.
    expect(mockGetAll.mock.calls[0][1]).toMatchObject({ scopes: ["private"] });
  });

  it("collapses a section to empty when the facet reports no evidence", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockRecall
      .mockResolvedValueOnce({
        memories: [],
        usedBudget: "low",
        reranked: false,
        candidateCount: 0,
      })
      .mockResolvedValueOnce({
        memories: [ranked("a")],
        usedBudget: "low",
        reranked: false,
        candidateCount: 1,
      });
    mockReflect.mockResolvedValueOnce(reflectResult("Interests", ["a"]));

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS });

    expect(doc.sections[0].text).toBe("");
    expect(doc.sections[0].sourceMemoryIds).toEqual([]);
    expect(doc.sections[0].stale).toBeUndefined();
    expect(doc.sections[1].text).toBe("Interests");
    // Empty recall short-circuits before reflect.
    expect(mockReflect).toHaveBeenCalledTimes(1);
  });

  it("reuses the previous doc wholesale when the vault hasn't advanced", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old", ["a"])],
      2000
    );
    // Match the C2 counts synthesizeProfile will recompute for mem("a") so
    // wholesale reuse keeps object identity.
    previous.observationTrends = {
      new: 0,
      strengthening: 0,
      stable: 0,
      weakening: 0,
      stale: 1,
    };

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(doc).toBe(previous);
    expect(mockReflect).not.toHaveBeenCalled();
  });

  it("delta-refreshes only facets whose cited facts changed (no new facts)", async () => {
    // "a" edited (updated_at 5000); "b" unchanged. Single fetch.
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(5000), createdAt: new Date(500) }),
      mem("b", { updatedAt: new Date(1000) }),
    ]);
    mockReflect.mockResolvedValueOnce(reflectResult("fresh bio", ["a"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(mockReflect).toHaveBeenCalledTimes(1);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("fresh bio");
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
    expect(doc.vaultWatermark).toBe(5000);
  });

  // Finding #2: a re-observation (last_observed_at) preserves updated_at, but must
  // still reach the delta so the citing section regenerates.
  it("delta-refreshes a facet when its fact was re-observed (last_observed_at)", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000), lastObservedAt: 5000 }), // re-observed
      mem("b", { updatedAt: new Date(1000) }),
    ]);
    mockReflect.mockResolvedValueOnce(reflectResult("reinforced bio", ["a"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(doc.vaultWatermark).toBe(5000);
    expect(mockReflect).toHaveBeenCalledTimes(1);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("reinforced bio");
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
  });

  // Fallback: a new fact with no usable embedding can't be attributed, so every
  // facet regenerates (the pre-attribution conservative behavior).
  it("regenerates all facets when a new fact has no embedding to attribute", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("c", { updatedAt: new Date(6000), createdAt: new Date(6000), embedding: null }), // new, unembedded
    ]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("new bio", ["a", "c"]))
      .mockResolvedValueOnce(reflectResult("new interests", ["c"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(mockEmbed).not.toHaveBeenCalled(); // bailed before embedding facet queries
    expect(mockReflect).toHaveBeenCalledTimes(2);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("new bio");
  });

  // Attribution: a new fact regenerates only the facet(s) whose query it clears
  // the cosine floor against — not the whole profile.
  it("attributes a new fact only to the facet it matches", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("b", { updatedAt: new Date(1000) }), // cited by interests; present + unchanged
      // New fact, embedding aligned with the FIRST facet query (bio).
      mem("c", {
        updatedAt: new Date(6000),
        createdAt: new Date(6000),
        embedding: JSON.stringify([1, 0]),
      }),
    ]);
    // Facet-query embeddings in facet order: bio=[1,0], interests=[0,1].
    mockEmbed.mockResolvedValue([
      [1, 0],
      [0, 1],
    ]);
    mockReflect.mockResolvedValueOnce(reflectResult("bio with new fact", ["a", "c"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(mockReflect).toHaveBeenCalledTimes(1); // only bio, not interests
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("bio with new fact");
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
  });

  // A candidate matching NO facet semantically can't be ruled out — recall's
  // non-vector lanes (BM25/entity/temporal) might still surface it — so we
  // conservatively regenerate ALL facets rather than risk a missed section.
  it("regenerates all facets when a new fact matches no facet query semantically", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("b", { updatedAt: new Date(1000) }), // cited by interests; present + unchanged
      // Orthogonal to both facet queries → below the cosine floor for each.
      mem("c", {
        updatedAt: new Date(6000),
        createdAt: new Date(6000),
        embedding: JSON.stringify([0, 0, 1]),
      }),
    ]);
    mockEmbed.mockResolvedValue([
      [1, 0, 0],
      [0, 1, 0],
    ]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("re bio", ["a"]))
      .mockResolvedValueOnce(reflectResult("re interests", ["b"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(mockReflect).toHaveBeenCalledTimes(2); // conservative full regen
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("re bio");
  });

  // Finding #1: a caller that newly adds a redactor must NOT get back the prior
  // un-gated doc via the fast path — the config change invalidates reuse.
  it("does not reuse an un-redacted prior doc when a redactor is newly supplied", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("Bio with x@y.com", ["a"]))
      .mockResolvedValueOnce(reflectResult("", [], false));
    const redactTextAsync = vi.fn().mockResolvedValue({ text: "Bio with [EMAIL_1]", matches: [] });

    const previous = priorDoc(
      [section("bio", "leaky x@y.com", ["a"]), section("interests", "", [])],
      2000,
      cfg(false) // was produced WITHOUT a redactor
    );

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: FACETS,
      previous,
      redactor: { redactTextAsync } as never,
    });

    expect(doc).not.toBe(previous);
    expect(mockReflect).toHaveBeenCalledTimes(2); // regenerated, not reused
    expect(doc.sections[0].text).toBe("Bio with [EMAIL_1]");
    expect(doc.config.redacted).toBe(true);
    expect(redactTextAsync).toHaveBeenCalledTimes(1); // only the non-empty section
  });

  // Finding #4: a version bump must not reuse old-shape sections via the delta path.
  it("fully regenerates when the previous doc version differs", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("new bio", ["a"]))
      .mockResolvedValueOnce(reflectResult("new interests", ["a"]));

    const previous: ProfileDoc = {
      ...priorDoc([section("bio", "old", ["a"]), section("interests", "old", ["a"])], 2000),
      version: PROFILE_DOC_VERSION + 999,
    };

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(mockReflect).toHaveBeenCalledTimes(2);
    expect(doc.sections[0].text).toBe("new bio");
    expect(doc.version).toBe(PROFILE_DOC_VERSION);
  });

  // Finding #3: one facet's reflect() rejecting must not fail the whole profile,
  // and must keep the prior section (marked stale) rather than wiping it.
  it("survives a facet failure and keeps the prior section marked stale", async () => {
    // Both facts changed → both facets stale → both regenerate.
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(5000), createdAt: new Date(500) }),
      mem("b", { updatedAt: new Date(5000), createdAt: new Date(500) }),
    ]);
    mockReflect
      .mockRejectedValueOnce(new Error("LLM down")) // bio fails
      .mockResolvedValueOnce(reflectResult("fresh interests", ["b"])); // interests ok

    const previous = priorDoc(
      [section("bio", "good old bio", ["a"]), section("interests", "old interests", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    const bio = doc.sections.find((s) => s.key === "bio")!;
    expect(bio.text).toBe("good old bio"); // prior preserved, not wiped
    expect(bio.stale).toBe(true);
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("fresh interests");
  });

  // Finding #3 (variant): a DEGRADED empty result (no explicit no-evidence verdict)
  // keeps the prior section stale rather than clearing it.
  it("keeps the prior section on a degraded-empty result", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(5000), createdAt: new Date(500) }),
    ]);
    // Empty text, NO structuredOutput → degraded, not a legitimate no-evidence verdict.
    mockReflect.mockResolvedValueOnce({
      text: "",
      basedOn: { memoryIds: ["a"] },
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as never);

    const previous = priorDoc(
      [section("bio", "good old bio", ["a"])],
      2000,
      fingerprint([FACETS[0]])
    );

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: [FACETS[0]],
      previous,
    });

    expect(doc.sections[0].text).toBe("good old bio");
    expect(doc.sections[0].stale).toBe(true);
  });

  // A section left stale by a prior failed regeneration must be retried on the
  // next call even when the vault hasn't advanced (the failure was transient) —
  // the fast path is skipped and the stale facet regenerates.
  it("retries a stale section even when the vault is unchanged", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(2000) }),
      mem("b", { updatedAt: new Date(2000) }), // cited by interests; present + unchanged
    ]);
    mockReflect.mockResolvedValueOnce(reflectResult("retried bio", ["a"]));

    const previous = priorDoc(
      [
        { ...section("bio", "old bio", ["a"]), stale: true },
        section("interests", "old interests", ["b"]),
      ],
      2000 // same as computed watermark → vault unchanged
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(doc).not.toBe(previous); // fast path skipped despite unchanged watermark
    expect(mockReflect).toHaveBeenCalledTimes(1); // only the stale facet retried
    const bio = doc.sections.find((s) => s.key === "bio")!;
    expect(bio.text).toBe("retried bio");
    expect(bio.stale).toBeFalsy();
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
  });

  // A first-synthesis facet failure (no prior to preserve) still marks the empty
  // section stale, so it's retried on the next call rather than stuck empty.
  it("marks an empty section stale when a facet fails with no prior", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect
      .mockRejectedValueOnce(new Error("LLM down")) // bio fails, no prior
      .mockResolvedValueOnce(reflectResult("interests", ["a"]));

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS });

    const bio = doc.sections.find((s) => s.key === "bio")!;
    expect(bio.text).toBe("");
    expect(bio.stale).toBe(true);
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("interests");
  });

  // When recall returns no evidence (cited facts were deleted/superseded), the
  // section is cleared rather than kept as a degraded prior.
  it("clears a section when recall finds no evidence", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(5000), createdAt: new Date(500) }),
    ]);
    // Empty text AND empty memoryIds → recall found nothing → legitimate clear.
    mockReflect.mockResolvedValueOnce({
      text: "",
      basedOn: { memoryIds: [] },
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as never);

    const previous = priorDoc([section("bio", "old bio", ["a"])], 2000, fingerprint([FACETS[0]]));

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[0]], previous });

    expect(doc.sections[0].text).toBe("");
    expect(doc.sections[0].stale).toBeFalsy();
  });

  // A: a thrown facet-query embedding must degrade to "regenerate all", never
  // reject the whole synthesizeProfile call.
  it("falls back to regenerating all facets when facet-query embedding throws", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("c", {
        updatedAt: new Date(6000),
        createdAt: new Date(6000),
        embedding: JSON.stringify([1, 0]),
      }),
    ]);
    mockEmbed.mockRejectedValue(new Error("embed service down"));
    mockReflect
      .mockResolvedValueOnce(reflectResult("bio", ["a", "c"]))
      .mockResolvedValueOnce(reflectResult("interests", ["c"]));

    const previous = priorDoc(
      [section("bio", "old", ["a"]), section("interests", "old", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(mockReflect).toHaveBeenCalledTimes(2); // regenerated all, didn't throw
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("bio");
  });

  // B: changing a facet's prompt (same keys) must invalidate reuse even when the
  // vault is unchanged — reused sections were generated under the old definition.
  it("does not reuse sections when a facet's prompt changed", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("re-bio", ["a"]))
      .mockResolvedValueOnce(reflectResult("re-interests", ["a"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old", ["a"])],
      2000
    );
    const tweaked: ProfileFacet[] = [
      { ...FACETS[0], guidance: "a materially different instruction" },
      FACETS[1],
    ];

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: tweaked, previous });

    expect(doc).not.toBe(previous);
    expect(mockReflect).toHaveBeenCalledTimes(2); // full regen under the new prompts
  });

  // C: a fact that newly enters scope carries an OLD createdAt but a bumped
  // updated_at; the old createdAt>watermark check would skip it, but it's now
  // attributed as changed + uncited evidence.
  it("attributes a fact that newly entered scope (old createdAt, uncited)", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }), // cited by bio, unchanged
      mem("b", { updatedAt: new Date(1000) }), // cited by interests; present + unchanged
      mem("d", {
        createdAt: new Date(100), // old — predates the watermark
        updatedAt: new Date(6000), // scope edit bumped this
        embedding: JSON.stringify([1, 0]),
      }),
    ]);
    mockEmbed.mockResolvedValue([
      [1, 0],
      [0, 1],
    ]);
    mockReflect.mockResolvedValueOnce(reflectResult("bio with newly in-scope fact", ["a", "d"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(mockReflect).toHaveBeenCalledTimes(1); // only bio (d attributed to bio)
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("bio with newly in-scope fact");
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
  });

  // A pure facet reorder (vault unchanged) reuses content but returns sections
  // in the NEW facet order — no regeneration.
  it("reorders reused sections to the current facet order without regenerating", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["a"])],
      2000
    );

    // Same facets, reversed order.
    const reversed: ProfileFacet[] = [FACETS[1], FACETS[0]];
    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: reversed, previous });

    expect(mockReflect).not.toHaveBeenCalled(); // reuse, no regeneration
    expect(doc.sections.map((s) => s.key)).toEqual(["interests", "bio"]); // new order
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("old bio"); // content reused
  });

  // If the scoped watermark DROPS below the prior doc's (an uncited high-changeTime
  // fact left scope), the baseline is unreliable → full regen + reset the mark,
  // rather than freezing on the inflated prior watermark.
  it("regenerates and resets the watermark when the scoped max dropped", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(2000) }), // cited by bio, present
      mem("b", { updatedAt: new Date(2000) }), // cited by interests, present
    ]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("re bio", ["a"]))
      .mockResolvedValueOnce(reflectResult("re interests", ["b"]));

    // Prior watermark 9000 was set by an uncited fact that has since left scope.
    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["b"])],
      9000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(doc).not.toBe(previous);
    expect(mockReflect).toHaveBeenCalledTimes(2); // full regen (baseline unreliable)
    expect(doc.vaultWatermark).toBe(2000); // baseline reset to current scoped max
  });

  // A partial/unparseable structured response must NOT publish the raw JSON
  // payload as section text — it degrades to the prior section (stale).
  it("does not publish a raw JSON payload when structured output is incomplete", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(5000), createdAt: new Date(500) }),
    ]);
    // Truncated JSON payload, no parsed structuredOutput.
    mockReflect.mockResolvedValueOnce({
      text: '{"summary": "half a sen',
      basedOn: { memoryIds: ["a"] },
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as never);

    const previous = priorDoc(
      [section("bio", "good prior bio", ["a"])],
      2000,
      fingerprint([FACETS[0]])
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[0]], previous });

    expect(doc.sections[0].text).toBe("good prior bio"); // prior kept, not the JSON fragment
    expect(doc.sections[0].stale).toBe(true);
  });

  // A cited fact that LEFT scope (or was hard-deleted) vanishes from the scoped
  // snapshot without advancing the watermark — the citing section must still
  // refresh rather than reuse evidence recall no longer returns.
  it("refreshes a section when a cited fact left scope (watermark unchanged)", async () => {
    // "a" (cited by bio) is gone from the scoped snapshot; "b" holds the mark at
    // 2000 so the watermark is UNCHANGED — isolating the missing-cited-fact path
    // from the watermark-decrease path.
    mockGetAll.mockResolvedValue([mem("b", { updatedAt: new Date(2000) })]);
    // bio's only evidence left scope → recall returns nothing → section clears.
    mockReflect.mockResolvedValueOnce({
      text: "",
      basedOn: { memoryIds: [] },
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as never);

    const previous = priorDoc(
      [section("bio", "old bio citing a", ["a"]), section("interests", "old interests", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(doc).not.toBe(previous); // fast path skipped despite unchanged watermark
    expect(mockReflect).toHaveBeenCalledTimes(1); // only bio refreshed
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe(""); // cleared
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
  });

  it("intersects facet evidence with reviewedMemoryIds before reflect", async () => {
    mockGetAll.mockResolvedValue([mem("a"), mem("b")]);
    mockRecall.mockResolvedValue({
      memories: [ranked("a"), ranked("b")],
      usedBudget: "low",
      reranked: false,
      candidateCount: 2,
    });
    mockReflect
      .mockResolvedValueOnce(reflectResult("Reviewed bio", ["a"]))
      .mockResolvedValueOnce(reflectResult("Reviewed interests", ["a"]));

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: FACETS,
      reviewedMemoryIds: ["a"],
    });

    expect(doc.sections[0].text).toBe("Reviewed bio");
    expect(mockReflect.mock.calls[0][2]?.memories?.map((m: RankedMemory) => m.id)).toEqual(["a"]);
    expect(mockReflect.mock.calls[1][2]?.memories?.map((m: RankedMemory) => m.id)).toEqual(["a"]);
  });

  it("recalls with RECALL_MAX_LIMIT when reviewedMemoryIds gate is on", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    // Honor limit so a regression to undefined/DEFAULT_LIMIT(8) fails loudly.
    mockRecall.mockImplementation(async (_q, _ctx, options) => {
      const all = Array.from({ length: 30 }, (_, i) => ranked(`m${i}`));
      const limit = options?.limit ?? 8;
      return {
        memories: all.slice(0, limit),
        usedBudget: "low" as const,
        reranked: false,
        candidateCount: all.length,
      };
    });
    mockReflect.mockResolvedValueOnce(reflectResult("Bio", ["m0"]));

    await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: [FACETS[0]],
      reviewedMemoryIds: ["m0", "m25"],
    });

    expect(mockRecall.mock.calls[0][2]?.limit).toBe(RECALL_MAX_LIMIT);
    // m25 ranks past DEFAULT_LIMIT(8) but within RECALL_MAX_LIMIT — must survive.
    expect(mockReflect.mock.calls[0][2]?.memories?.map((m: RankedMemory) => m.id)).toEqual([
      "m0",
      "m25",
    ]);
  });

  it("clears a section when reviewedMemoryIds excludes all recalled evidence", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockRecall.mockResolvedValue({
      memories: [ranked("a")],
      usedBudget: "low",
      reranked: false,
      candidateCount: 1,
    });

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: [FACETS[0]],
      reviewedMemoryIds: ["not-a"],
    });

    expect(doc.sections[0].text).toBe("");
    expect(doc.sections[0].sourceMemoryIds).toEqual([]);
    expect(doc.sections[0].stale).toBeUndefined();
    expect(mockReflect).not.toHaveBeenCalled();
  });

  // An empty reviewedMemoryIds array means "nothing is approved for publication", so it must gate
  // everything OUT — not disable the gate. Previously this failed open, which was backwards in
  // exactly the case the gate exists for: a caller passing its published-memory set for a user who
  // has published nothing handed over [] and got synthesis across the whole private vault.
  it("gates everything out when reviewedMemoryIds is empty (fails closed)", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockRecall.mockResolvedValue({
      memories: [ranked("a"), ranked("b")],
      usedBudget: "low",
      reranked: false,
      candidateCount: 2,
    });

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: [FACETS[0]],
      reviewedMemoryIds: [],
    });

    expect(doc.sections[0].text).toBe("");
    expect(doc.sections[0].sourceMemoryIds).toEqual([]);
    // Legitimate empty, not a failure — must not be marked stale (which would force a retry).
    expect(doc.sections[0].stale).toBeUndefined();
    // And it costs nothing: no LLM call, and not even a recall.
    expect(mockReflect).not.toHaveBeenCalled();
    expect(mockRecall).not.toHaveBeenCalled();
  });

  // The column-backed facets are the ones with a publication consequence: `occupation`
  // and `interests` are what a profile store writes verbatim into a PUBLIC row. The
  // existing fail-closed test covers `bio`, whose only output is prose. If the gate
  // stopped the prose but a structured value still came through, an empty published
  // set would produce a public profile column derived from memories the user never
  // approved — the exact leak the gate exists to prevent, in the one field that
  // travels furthest.
  it("emits no structured occupation or interests when the gate excludes everything", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockRecall.mockResolvedValue({
      memories: [ranked("a"), ranked("b")],
      usedBudget: "low",
      reranked: false,
      candidateCount: 2,
    });

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: [WORK_ROLE, FACETS[1]],
      reviewedMemoryIds: [],
    });

    const work = doc.sections.find((s) => s.key === "work_role");
    const interests = doc.sections.find((s) => s.key === "interests");
    expect(work?.text).toBe("");
    expect(interests?.text).toBe("");
    // Absent, not empty-string / empty-array: absence is "no claim", whereas a
    // present-but-empty value is a claim a store may write over a prior good one.
    expect(work).not.toHaveProperty("occupation");
    expect(interests).not.toHaveProperty("interests");
    expect(mockReflect).not.toHaveBeenCalled();
  });

  it("still runs ungated when reviewedMemoryIds is omitted entirely", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockRecall.mockResolvedValue({
      memories: [ranked("a"), ranked("b")],
      usedBudget: "low",
      reranked: false,
      candidateCount: 2,
    });
    mockReflect.mockResolvedValueOnce(reflectResult("Bio", ["a", "b"]));

    // Omitted (not []) is the only way to ask for no gate.
    await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[0]] });

    expect(mockReflect.mock.calls[0][2]?.memories?.map((m: RankedMemory) => m.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("does not reuse an ungated prior doc once the empty gate is active", async () => {
    // A doc synthesized with no gate must not satisfy a later gated-empty request: the config
    // fingerprint has to distinguish "no gate" from "gate active, nothing approved", or previously
    // private-derived content would be served verbatim under the stricter policy.
    mockGetAll.mockResolvedValue([mem("a")]);
    mockRecall.mockResolvedValue({
      memories: [ranked("a")],
      usedBudget: "low",
      reranked: false,
      candidateCount: 1,
    });
    mockReflect.mockResolvedValueOnce(reflectResult("Bio", ["a"]));

    const ungated = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[0]] });
    expect(ungated.sections[0].text).toBe("Bio");

    const gated = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: [FACETS[0]],
      previous: ungated,
      reviewedMemoryIds: [],
    });
    expect(gated.sections[0].text).toBe("");
  });

  it("invalidates delta reuse when reviewedMemoryIds changes (vault unchanged)", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) }), mem("b")]);
    mockRecall.mockResolvedValue({
      memories: [ranked("a"), ranked("b")],
      usedBudget: "low",
      reranked: false,
      candidateCount: 2,
    });
    mockReflect
      .mockResolvedValueOnce(reflectResult("Narrow bio", ["a"]))
      .mockResolvedValueOnce(reflectResult("Narrow interests", ["a"]));

    const previous = priorDoc(
      [section("bio", "Wide bio", ["a", "b"]), section("interests", "Wide interests", ["a", "b"])],
      2000,
      fingerprint(FACETS, false, ["a", "b"])
    );
    previous.observationTrends = {
      new: 0,
      strengthening: 0,
      stable: 0,
      weakening: 0,
      stale: 2,
    };

    // Same vault watermark; review set narrowed a,b → a. Must not reuse.
    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: FACETS,
      previous,
      reviewedMemoryIds: ["a"],
    });

    expect(doc).not.toBe(previous);
    expect(doc.config.reviewedMemoryIdsSignature).toBe("a");
    expect(doc.sections[0].text).toBe("Narrow bio");
    expect(doc.sections[0].sourceMemoryIds).toEqual(["a"]);
    expect(mockReflect).toHaveBeenCalledTimes(2);
  });

  // Chat auto-extract writes unreviewed facts constantly, and they land in the
  // changed-set (which tracks the whole scoped vault) — but the gate strips them
  // from the evidence, so the section's actual input is unchanged. Attributing
  // one would bill an identical re-synthesis.
  it("does not regenerate a gated facet for an unreviewed changed fact", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }), // cited by bio, reviewed, unchanged
      mem("b", { updatedAt: new Date(1000) }), // cited by interests, reviewed, unchanged
      // Freshly auto-extracted, NOT reviewed. Embedding lines up with the bio
      // query, so attribution would mark bio stale if it ever saw this fact.
      mem("z", {
        createdAt: new Date(6000),
        updatedAt: new Date(6000),
        embedding: JSON.stringify([1, 0]),
      }),
    ]);
    mockEmbed.mockResolvedValue([
      [1, 0],
      [0, 1],
    ]);
    mockReflect.mockResolvedValue(reflectResult("rebilled bio", ["a"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["b"])],
      2000,
      fingerprint(FACETS, false, ["a", "b"])
    );

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: FACETS,
      previous,
      reviewedMemoryIds: ["a", "b"],
    });

    expect(mockReflect).not.toHaveBeenCalled();
    expect(mockEmbed).not.toHaveBeenCalled(); // never even reached attribution
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("old bio");
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
    // The mark still advances past the unreviewed write, so the next call with a
    // quiet vault takes the fast path instead of re-deriving this every time.
    expect(doc.vaultWatermark).toBe(6000);
  });

  // The costliest shape of the same bug: a just-extracted fact usually has no
  // embedding yet, and an unattributable candidate bails to "regenerate ALL".
  // Under the gate that is the whole profile re-billed for evidence that never
  // moved.
  it("does not regenerate every gated facet for an unreviewed, unembedded fact", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("b", { updatedAt: new Date(1000) }),
      mem("z", { createdAt: new Date(6000), updatedAt: new Date(6000), embedding: null }),
    ]);
    mockReflect.mockResolvedValue(reflectResult("rebilled", ["a"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["b"])],
      2000,
      fingerprint(FACETS, false, ["a", "b"])
    );

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: FACETS,
      previous,
      reviewedMemoryIds: ["a", "b"],
    });

    expect(mockReflect).not.toHaveBeenCalled();
    expect(doc.sections.map((s) => s.text)).toEqual(["old bio", "old interests"]);
  });

  // Guard on the filter above: it must narrow to the reviewed set, not disable
  // attribution. A REVIEWED fact that no section cites yet is real new evidence
  // — it clears the gate, so it can enter a facet's next synthesis.
  it("still attributes a reviewed changed fact no section cites", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("b", { updatedAt: new Date(1000) }),
      mem("c", {
        createdAt: new Date(6000),
        updatedAt: new Date(6000),
        embedding: JSON.stringify([1, 0]), // matches the bio query
      }),
    ]);
    mockEmbed.mockResolvedValue([
      [1, 0],
      [0, 1],
    ]);
    mockRecall.mockResolvedValue({
      memories: [ranked("a"), ranked("c")],
      usedBudget: "low",
      reranked: false,
      candidateCount: 2,
    });
    mockReflect.mockResolvedValueOnce(reflectResult("bio with c", ["a", "c"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["b"])],
      2000,
      fingerprint(FACETS, false, ["a", "b", "c"])
    );

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: FACETS,
      previous,
      reviewedMemoryIds: ["a", "b", "c"],
    });

    expect(mockReflect).toHaveBeenCalledTimes(1); // bio only
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("bio with c");
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
  });

  // The two facets that back a profile column emit a structured value BESIDE
  // the prose — the prose contract is unchanged, so existing consumers of
  // `text` see nothing new.
  it("emits a structured occupation alongside the work_role prose", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect.mockResolvedValueOnce(
      reflectResult("Backend engineer at a fintech startup.", ["a"], true, {
        occupation: "  Backend engineer, fintech  ",
      })
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE] });

    expect(doc.sections[0].text).toBe("Backend engineer at a fintech startup.");
    expect(doc.sections[0].occupation).toBe("Backend engineer, fintech");
    expect(doc.sections[0].interests).toBeUndefined();
  });

  it("emits structured interests alongside the interests prose", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect.mockResolvedValueOnce(
      reflectResult("trail running, film photography, Thai cooking", ["a"], true, {
        interests: ["trail running", "film photography", "Thai cooking"],
      })
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[1]] });

    expect(doc.sections[0].text).toBe("trail running, film photography, Thai cooking");
    expect(doc.sections[0].interests).toEqual([
      "trail running",
      "film photography",
      "Thai cooking",
    ]);
    expect(doc.sections[0].occupation).toBeUndefined();
  });

  it("omits a blank occupation rather than publishing an empty column value", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect.mockResolvedValueOnce(
      reflectResult("Works in logistics.", ["a"], true, { occupation: "   " })
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE] });

    expect(doc.sections[0].text).toBe("Works in logistics.");
    expect("occupation" in doc.sections[0]).toBe(false);
  });

  // The caps are RUNE counts server-side (utf8.RuneCountInString). Measuring in
  // UTF-16 units would score every astral-plane character double and reject
  // values the server accepts — the CJK/emoji bug class this repo has hit before.
  it("measures the length caps in code points, not UTF-16 units", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    const occupation = "\u{1D518}".repeat(45); // 45 code points, 90 UTF-16 units
    const interest = "\u{1D518}".repeat(25); // 25 code points, 50 UTF-16 units
    expect(occupation.length).toBe(90);
    expect(interest.length).toBe(50);

    mockReflect
      .mockResolvedValueOnce(reflectResult("role prose", ["a"], true, { occupation }))
      .mockResolvedValueOnce(
        reflectResult("interests prose", ["a"], true, { interests: [interest] })
      );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE, FACETS[1]] });

    expect(doc.sections[0].occupation).toBe(occupation); // inside the 80-rune cap
    expect(doc.sections[1].interests).toEqual([interest]); // inside the 40-rune cap
  });

  // The server rejects an over-cap upsert outright, so an over-cap value has to
  // go. Dropping beats truncating: the prose still carries the full statement,
  // and a phrase clipped mid-word misrepresents the person in a field read as fact.
  it("drops over-cap structured values instead of truncating them", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect
      .mockResolvedValueOnce(
        reflectResult("role prose", ["a"], true, { occupation: "x".repeat(81) })
      )
      .mockResolvedValueOnce(
        reflectResult("interests prose", ["a"], true, {
          interests: ["y".repeat(41), "film photography"],
        })
      );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE, FACETS[1]] });

    expect(doc.sections[0].text).toBe("role prose"); // prose untouched
    expect(doc.sections[0].occupation).toBeUndefined();
    // One over-long entry doesn't cost the rest of the list.
    expect(doc.sections[1].interests).toEqual(["film photography"]);
  });

  // Mirrors nearby's normalizeInterests (the column is a SET) plus the caps it
  // validates before normalizing.
  it("normalizes interests into a deduped, capped set", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect.mockResolvedValueOnce(
      reflectResult("prose", ["a"], true, {
        interests: [
          "Ramen",
          "  ramen ", // differs only by case + space → dropped, first spelling wins
          "   ", // blank
          42, // not a string
          ...Array.from({ length: 13 }, (_, i) => `hobby ${i}`),
        ],
      })
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[1]] });

    const interests = doc.sections[0].interests!;
    expect(interests).toHaveLength(12);
    // Deduping runs before the item cap, so duplicates don't eat slots.
    expect(interests[0]).toBe("Ramen");
    expect(interests.slice(1)).toEqual(Array.from({ length: 11 }, (_, i) => `hobby ${i}`));
  });

  // The default synthesis model gets the schema as a prompt instruction, not an
  // enforced response_format, so it sometimes answers with the comma-separated
  // shape the summary guidance asks for. Recover it from the structured slot
  // rather than losing the field.
  it("recovers interests emitted as a comma-separated string", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect.mockResolvedValueOnce(
      reflectResult("prose", ["a"], true, {
        interests: "trail running, film photography ,, Thai cooking",
      })
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[1]] });

    expect(doc.sections[0].interests).toEqual([
      "trail running",
      "film photography",
      "Thai cooking",
    ]);
  });

  // The same fallback has to handle a model that serialized the array into the
  // string slot. Splitting that on commas leaves the brackets and quotes
  // attached, and they'd clear every downstream check — non-blank, well inside
  // the length cap — and land verbatim in a published column.
  it("recovers interests emitted as a serialized array rather than splitting it", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect
      .mockResolvedValueOnce(
        reflectResult("prose", ["a"], true, {
          interests: JSON.stringify(["trail running", "film photography"]),
        })
      )
      // Bracketed but unquoted — not parseable, so it falls back to the split.
      .mockResolvedValueOnce(
        reflectResult("prose", ["a"], true, { interests: "[trail running, film photography]" })
      );

    const bracketed = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[1]] });
    const unquoted = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[1]] });

    expect(bracketed.sections[0].interests).toEqual(["trail running", "film photography"]);
    expect(unquoted.sections[0].interests).toEqual(["trail running", "film photography"]);
  });

  // Shedding the outer brackets alone doesn't get the quotes off, and the
  // truncated shape never reaches the bracket path at all. Each of these lands
  // a fragment that is non-blank and under the length cap, so nothing
  // downstream would have caught it.
  it("sheds serialization punctuation from near-JSON interests strings", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    const shapes = [
      // Valid-looking but unparseable: trailing comma inside the array.
      '["trail running", "film photography",]',
      // Python-style single quotes.
      "['trail running', 'film photography']",
      // Truncated mid-array — no closing bracket, so the bracket path is skipped
      // and the opening bracket rides along on the first fragment.
      '["trail running", "film photography"',
      // Quoted entries with the brackets already missing.
      '"trail running", "film photography"',
    ];

    for (const shape of shapes) {
      mockReflect.mockResolvedValueOnce(reflectResult("prose", ["a"], true, { interests: shape }));
      const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[1]] });
      expect(doc.sections[0].interests).toEqual(["trail running", "film photography"]);
    }
  });

  // The counterweight to the strip above: an entry whose leading apostrophe is
  // part of the name has to survive, so only a matched pair of quotes comes off.
  it("keeps an unmatched leading quote that belongs to the interest", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect.mockResolvedValueOnce(
      reflectResult("prose", ["a"], true, { interests: "'90s music, trail running" })
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[1]] });

    expect(doc.sections[0].interests).toEqual(["'90s music", "trail running"]);
  });

  // Every extracted entry costs an NER inference before the item cap is applied,
  // and this field is unenforced model output — an answer that ignores the array
  // shape can split into hundreds of fragments. The extraction bound is what
  // keeps one bad response from turning into hundreds of sequential inferences.
  it("bounds how many raw interests reach the redactor", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect.mockResolvedValueOnce(
      reflectResult("prose", ["a"], true, {
        interests: Array.from({ length: 500 }, (_, i) => `hobby ${i}`).join(","),
      })
    );
    const redactTextAsync = vi.fn(async (text: string) => ({ text, matches: [] }));

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: [FACETS[1]],
      redactor: { redactTextAsync } as never,
    });

    // One call for the prose, then at most twice the publish cap for the list.
    expect(redactTextAsync.mock.calls.length).toBeLessThanOrEqual(1 + 12 * 2);
    // The bound is invisible in the result: the 12 published entries are the
    // same ones an unbounded list would have produced.
    expect(doc.sections[0].interests).toEqual(Array.from({ length: 12 }, (_, i) => `hobby ${i}`));
  });

  // A mis-shaped structured field must never take the prose section down with it.
  it("omits a structured attribute the model returned in the wrong shape", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("role prose", ["a"], true, { occupation: 42 }))
      .mockResolvedValueOnce(
        reflectResult("interests prose", ["a"], true, { interests: { a: 1 } })
      );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE, FACETS[1]] });

    expect(doc.sections[0].text).toBe("role prose");
    expect(doc.sections[0].occupation).toBeUndefined();
    expect(doc.sections[1].text).toBe("interests prose");
    expect(doc.sections[1].interests).toBeUndefined();
  });

  it("ignores a structured attribute volunteered by a facet with no column", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect.mockResolvedValueOnce(
      reflectResult("A bio", ["a"], true, {
        occupation: "Backend engineer",
        interests: ["ramen"],
      })
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[0]] });

    expect(doc.sections[0].text).toBe("A bio");
    expect(doc.sections[0].occupation).toBeUndefined();
    expect(doc.sections[0].interests).toBeUndefined();
  });

  // A no-evidence verdict clears the section — its structured values have to go
  // with it, or a cleared profile keeps publishing the old column value.
  it("clears the structured values on a no-evidence verdict", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(5000), createdAt: new Date(500) }),
    ]);
    mockReflect.mockResolvedValueOnce(
      reflectResult("", ["a"], false, { occupation: "still here" })
    );

    const previous = priorDoc(
      [{ ...section("work_role", "old prose", ["a"]), occupation: "old role" }],
      2000,
      fingerprint([WORK_ROLE])
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE], previous });

    expect(doc.sections[0].text).toBe("");
    expect(doc.sections[0].occupation).toBeUndefined();
    expect(doc.sections[0].stale).toBeFalsy();
  });

  // Failure keeps the whole prior section, structured values included — the
  // column shouldn't empty out because one LLM call fell over.
  it("carries a prior section's structured values forward when regeneration fails", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(5000), createdAt: new Date(500) }),
    ]);
    mockReflect.mockRejectedValueOnce(new Error("LLM down"));

    const previous = priorDoc(
      [
        {
          ...section("work_role", "Backend engineer at a fintech startup.", ["a"]),
          occupation: "Backend engineer, fintech",
        },
      ],
      2000,
      fingerprint([WORK_ROLE])
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE], previous });

    expect(doc.sections[0].occupation).toBe("Backend engineer, fintech");
    expect(doc.sections[0].stale).toBe(true);
  });

  // Structured values are published text, so `config.redacted` has to hold for
  // them too — and redaction is what makes ordering matter: two distinct
  // interests can collapse to the same placeholder, so the dedupe has to run
  // afterwards.
  it("redacts structured values and normalizes the redacted text", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect.mockResolvedValueOnce(
      reflectResult("Hiking with Alice and Bob.", ["a"], true, {
        interests: ["Hiking with Alice", "Hiking with Bob", "film photography"],
      })
    );
    const redactTextAsync = vi.fn(async (text: string) => ({
      text: text.replace(/Alice|Bob/g, "[PERSON_1]"),
      matches: [],
    }));

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: [FACETS[1]],
      redactor: { redactTextAsync } as never,
    });

    expect(doc.sections[0].text).toBe("Hiking with [PERSON_1] and [PERSON_1].");
    expect(doc.sections[0].interests).toEqual(["Hiking with [PERSON_1]", "film photography"]);
  });

  it("drops an occupation that redaction pushed past the cap", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    // Inside the cap as the model wrote it; over it once the placeholder lands.
    const occupation = "Support engineer at a mid-sized logistics firm, a@b.co";
    expect(occupation.length).toBeLessThanOrEqual(80);
    mockReflect.mockResolvedValueOnce(reflectResult("role prose", ["a"], true, { occupation }));
    const redactTextAsync = vi.fn(async (text: string) => ({
      text: text.replace("a@b.co", "[EMAIL_ADDRESS_PLACEHOLDER_NUMBER_ONE]"),
      matches: [],
    }));

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: [WORK_ROLE],
      redactor: { redactTextAsync } as never,
    });

    expect(doc.sections[0].text).toBe("role prose");
    expect(doc.sections[0].occupation).toBeUndefined();
  });

  // Delta refresh only revisits facets whose FACTS changed, so a doc cached
  // before the structured attributes existed would never grow them. The response
  // schema is folded into facetsSignature precisely to force that one regeneration.
  it("does not reuse a doc whose facet signature predates the response schema", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("re bio", ["a"]))
      .mockResolvedValueOnce(reflectResult("re interests", ["a"]));

    // The pre-change formula: key + label + query + guidance, no schema.
    const legacySignature = FACETS.map((f) => JSON.stringify([f.key, f.label, f.query, f.guidance]))
      .sort()
      .join("\n");
    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["a"])],
      2000,
      { ...cfg(), facetsSignature: legacySignature }
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(doc).not.toBe(previous);
    expect(mockReflect).toHaveBeenCalledTimes(2);
    expect(doc.config.facetsSignature).not.toBe(legacySignature);
  });
});
