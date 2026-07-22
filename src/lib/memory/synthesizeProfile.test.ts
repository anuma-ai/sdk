import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./reflect.js", () => ({ reflect: vi.fn() }));
vi.mock("../db/memoryVault/operations.js", () => ({ getAllVaultMemoriesOp: vi.fn() }));
vi.mock("../memoryEngine/embeddings.js", () => ({ generateEmbeddings: vi.fn() }));

import { getAllVaultMemoriesOp } from "../db/memoryVault/operations.js";
import type { StoredVaultMemory } from "../db/memoryVault/types.js";
import { generateEmbeddings } from "../memoryEngine/embeddings.js";
import { reflect } from "./reflect.js";
import {
  type ProfileConfigFingerprint,
  type ProfileDoc,
  type ProfileFacet,
  type ProfileSection,
  PROFILE_DOC_VERSION,
  synthesizeProfile,
} from "./synthesizeProfile.js";
import type { RecallContext } from "./types.js";

const mockReflect = vi.mocked(reflect);
const mockGetAll = vi.mocked(getAllVaultMemoriesOp);
const mockEmbed = vi.mocked(generateEmbeddings);

// vaultCtx just needs to be a truthy object — the ops are mocked.
const ctx = {
  embeddingOptions: { apiKey: "k" },
  vaultCtx: {},
} as unknown as RecallContext;

const FACETS: ProfileFacet[] = [
  { key: "bio", label: "Bio", query: "who", guidance: "g" },
  { key: "interests", label: "Interests", query: "what", guidance: "g" },
];

/** Mirror of the source facetsSignature() — keep in sync. */
function sig(facets: ProfileFacet[]): string {
  return facets
    .map((f) => JSON.stringify([f.key, f.label, f.query, f.guidance]))
    .sort()
    .join("\n");
}

/** The config fingerprint a given facet set + default scopes produce. */
function fingerprint(facets: ProfileFacet[], redacted = false): ProfileConfigFingerprint {
  return {
    facetKeys: facets.map((f) => f.key).sort(),
    facetsSignature: sig(facets),
    scopes: ["private"],
    redacted,
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
    createdAt: opts.createdAt ?? new Date(500),
    updatedAt: opts.updatedAt ?? new Date(1000),
    isDeleted: false,
    ...opts,
  };
}

function reflectResult(summary: string, memoryIds: string[], hasEvidence = true) {
  return {
    text: summary,
    structuredOutput: { summary, hasEvidence },
    basedOn: { memoryIds },
    usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
  };
}

function section(key: "bio" | "interests", text: string, ids: string[]): ProfileSection {
  return {
    key,
    label: key === "bio" ? "Bio" : "Interests",
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
    generatedAt: 1,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("synthesizeProfile", () => {
  it("throws without a vault context", async () => {
    await expect(
      synthesizeProfile({ embeddingOptions: { apiKey: "k" } } as RecallContext)
    ).rejects.toThrow(/vaultCtx/);
  });

  it("synthesizes one section per facet, carrying source ids + watermark + config", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(3000) })]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("A bio", ["a"]))
      .mockResolvedValueOnce(reflectResult("Some interests", ["a"]));

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS });

    expect(doc.version).toBe(PROFILE_DOC_VERSION);
    expect(doc.sections.map((s) => s.key)).toEqual(["bio", "interests"]);
    expect(doc.sections[0].text).toBe("A bio");
    expect(doc.sections[0].sourceMemoryIds).toEqual(["a"]);
    expect(doc.vaultWatermark).toBe(3000);
    expect(doc.config).toEqual(cfg(false));
    expect(mockReflect).toHaveBeenCalledTimes(2);
    // The snapshot is scoped to the same scopes synthesis recalls from.
    expect(mockGetAll.mock.calls[0][1]).toMatchObject({ scopes: ["private"] });
  });

  it("collapses a section to empty when the facet reports no evidence", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("", [], false))
      .mockResolvedValueOnce(reflectResult("Interests", ["a"]));

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS });

    expect(doc.sections[0].text).toBe("");
    expect(doc.sections[1].text).toBe("Interests");
  });

  it("reuses the previous doc wholesale when the vault hasn't advanced", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old", ["a"])],
      2000
    );

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

  it("attributes nothing when a new fact matches no facet query", async () => {
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

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(mockReflect).not.toHaveBeenCalled(); // unrelated new fact → no regeneration
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("old bio");
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
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
});
