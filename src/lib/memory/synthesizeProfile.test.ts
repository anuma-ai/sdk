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

const ctx = {
  embeddingOptions: { apiKey: "k" },
  vaultCtx: {},
  vaultCache: new Map(),
} as unknown as RecallContext;

const FACETS: ProfileFacet[] = [
  { key: "bio", label: "Bio", query: "who", guidance: "g" },
  { key: "interests", label: "Interests", query: "what", guidance: "g" },
];

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

function fingerprint(
  facets: ProfileFacet[],
  redacted = false,
  reviewedMemoryIds: readonly string[] = []
): ProfileConfigFingerprint {
  return {
    facetKeys: facets.map((f) => f.key).sort(),
    facetsSignature: facetsSignature(facets),
    scopes: ["private"],
    redacted,
    reviewedMemoryIdsSignature: [...new Set(reviewedMemoryIds)].sort().join("\n"),
  };
}

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

function stubRecallForReflect() {
  mockRecall.mockResolvedValue({
    memories: [ranked("a")],
    usedBudget: "low" as const,
    reranked: false,
    candidateCount: 1,
  });
}

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

    for (const call of mockReflect.mock.calls) {
      expect(call[2]?.systemPrompt).toContain(INTERNAL_FLOW_MARKER);
    }

    expect(doc.version).toBe(PROFILE_DOC_VERSION);
    expect(doc.sections.map((s) => s.key)).toEqual(["bio", "interests"]);
    expect(doc.sections[0].text).toBe("A bio");
    expect(doc.sections[0].sourceMemoryIds).toEqual(["a"]);
    expect(doc.vaultWatermark).toBe(3000);
    expect(doc.config).toEqual(cfg(false));
    expect(doc.observationTrends).toEqual({
      new: 0,
      strengthening: 0,
      stable: 0,
      weakening: 0,
      stale: 1,
    });
    expect(mockRecall).toHaveBeenCalledTimes(2);
    expect(mockReflect).toHaveBeenCalledTimes(2);
    expect(mockRecall.mock.calls[0][2]).toMatchObject({
      factTypeWeights: DEFAULT_PROFILE_FACT_TYPE_WEIGHTS,
      proofCountAlpha: DEFAULT_PROFILE_PROOF_ALPHA,
      types: ["fact"],
    });
    expect(mockReflect.mock.calls[0][2]).toMatchObject({
      memories: [expect.objectContaining({ id: "a" })],
    });
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
    expect(mockReflect).toHaveBeenCalledTimes(1);
  });

  it("reuses the previous doc wholesale when the vault hasn't advanced", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old", ["a"])],
      2000
    );
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

  it("delta-refreshes a facet when its fact was re-observed (last_observed_at)", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000), lastObservedAt: 5000 }),
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

  it("regenerates all facets when a new fact has no embedding to attribute", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("c", { updatedAt: new Date(6000), createdAt: new Date(6000), embedding: null }),
    ]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("new bio", ["a", "c"]))
      .mockResolvedValueOnce(reflectResult("new interests", ["c"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(mockEmbed).not.toHaveBeenCalled();
    expect(mockReflect).toHaveBeenCalledTimes(2);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("new bio");
  });

  it("attributes a new fact only to the facet it matches", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("b", { updatedAt: new Date(1000) }),
      mem("c", {
        updatedAt: new Date(6000),
        createdAt: new Date(6000),
        embedding: JSON.stringify([1, 0]),
      }),
    ]);
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

    expect(mockReflect).toHaveBeenCalledTimes(1);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("bio with new fact");
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
  });

  it("regenerates all facets when a new fact matches no facet query semantically", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("b", { updatedAt: new Date(1000) }),
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

    expect(mockReflect).toHaveBeenCalledTimes(2);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("re bio");
  });

  it("does not reuse an un-redacted prior doc when a redactor is newly supplied", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("Bio with x@y.com", ["a"]))
      .mockResolvedValueOnce(reflectResult("", [], false));
    const redactTextAsync = vi.fn().mockResolvedValue({ text: "Bio with [EMAIL_1]", matches: [] });

    const previous = priorDoc(
      [section("bio", "leaky x@y.com", ["a"]), section("interests", "", [])],
      2000,
      cfg(false)
    );

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: FACETS,
      previous,
      redactor: { redactTextAsync } as never,
    });

    expect(doc).not.toBe(previous);
    expect(mockReflect).toHaveBeenCalledTimes(2);
    expect(doc.sections[0].text).toBe("Bio with [EMAIL_1]");
    expect(doc.config.redacted).toBe(true);
    expect(redactTextAsync).toHaveBeenCalledTimes(1);
  });

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

  it("survives a facet failure and clears the changed prior section", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(5000), createdAt: new Date(500) }),
      mem("b", { updatedAt: new Date(5000), createdAt: new Date(500) }),
    ]);
    mockReflect
      .mockRejectedValueOnce(new Error("LLM down"))
      .mockResolvedValueOnce(reflectResult("fresh interests", ["b"]));

    const previous = priorDoc(
      [section("bio", "good old bio", ["a"]), section("interests", "old interests", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    const bio = doc.sections.find((s) => s.key === "bio")!;
    expect(bio.text).toBe("");
    expect(bio.stale).toBe(true);
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("fresh interests");
  });

  it("keeps the prior section on a degraded-empty result", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(2000), createdAt: new Date(500) }),
    ]);
    mockReflect.mockResolvedValueOnce({
      text: "",
      basedOn: { memoryIds: ["a"] },
      usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    } as never);

    const previous = priorDoc(
      [{ ...section("bio", "good old bio", ["a"]), stale: true }],
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

  it.each([
    ["deleted", "recall"],
    ["deleted", "degraded"],
    ["corrected", "recall"],
    ["corrected", "degraded"],
    ["superseded", "recall"],
    ["superseded", "degraded"],
  ])("clears %s source claims after a %s failure", async (change, failure) => {
    const source = mem("a", {
      content: "The corrected role",
      updatedAt: new Date(5000),
      ...(change === "superseded" ? { supersededBy: "b", supersededAt: 5000 } : {}),
    });
    mockGetAll.mockResolvedValue([
      ...(change === "deleted" ? [] : [source]),
      mem("b", { updatedAt: new Date(5000) }),
    ]);
    if (failure === "recall") {
      mockRecall.mockRejectedValue(new Error("Recall failed"));
    } else {
      mockRecall.mockResolvedValue({
        memories: [ranked("b")],
        usedBudget: "low",
        reranked: false,
        candidateCount: 1,
      });
      mockReflect.mockResolvedValue({
        text: "",
        basedOn: { memoryIds: ["b"] },
        usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      } as never);
    }
    const previous = priorDoc(
      [
        {
          ...section("work_role", "Old role", ["a"]),
          occupation: "Old role",
        },
      ],
      2000,
      fingerprint([WORK_ROLE])
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE], previous });

    expect(doc.sections[0]).toMatchObject({ text: "", sourceMemoryIds: [], stale: true });
    expect(doc.sections[0].occupation).toBeUndefined();
    expect(doc.sections[0].interests).toBeUndefined();
    const retry = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE], previous });
    expect(retry.sections[0]).toMatchObject({ text: "", sourceMemoryIds: [], stale: true });
    expect(retry.sections[0].occupation).toBeUndefined();
  });

  it("keeps an intact prior section when an unrelated delete rolls the watermark back", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(2000), createdAt: new Date(500) }),
    ]);
    mockReflect.mockRejectedValueOnce(new Error("LLM down"));

    const previous = priorDoc(
      [
        {
          ...section("work_role", "Backend engineer at a fintech startup.", ["a"]),
          occupation: "Backend engineer, fintech",
        },
      ],
      5000,
      fingerprint([WORK_ROLE])
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE], previous });

    expect(doc.vaultWatermark).toBe(2000);
    expect(doc.sections[0].text).toBe("Backend engineer at a fintech startup.");
    expect(doc.sections[0].occupation).toBe("Backend engineer, fintech");
    expect(doc.sections[0].stale).toBe(true);
  });

  it("still clears a section whose own source is the delete that rolled the watermark back", async () => {
    mockGetAll.mockResolvedValue([
      mem("b", { updatedAt: new Date(2000), createdAt: new Date(500) }),
    ]);
    mockReflect.mockRejectedValueOnce(new Error("LLM down"));

    const previous = priorDoc(
      [
        {
          ...section("work_role", "Old role", ["a"]),
          occupation: "Old role",
        },
      ],
      5000,
      fingerprint([WORK_ROLE])
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE], previous });

    expect(doc.sections[0]).toMatchObject({ text: "", sourceMemoryIds: [], stale: true });
    expect(doc.sections[0].occupation).toBeUndefined();
  });

  it("retries a stale section even when the vault is unchanged", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(2000) }),
      mem("b", { updatedAt: new Date(2000) }),
    ]);
    mockReflect.mockResolvedValueOnce(reflectResult("retried bio", ["a"]));

    const previous = priorDoc(
      [
        { ...section("bio", "old bio", ["a"]), stale: true },
        section("interests", "old interests", ["b"]),
      ],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(doc).not.toBe(previous);
    expect(mockReflect).toHaveBeenCalledTimes(1);
    const bio = doc.sections.find((s) => s.key === "bio")!;
    expect(bio.text).toBe("retried bio");
    expect(bio.stale).toBeFalsy();
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
  });

  it("marks an empty section stale when a facet fails with no prior", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect
      .mockRejectedValueOnce(new Error("LLM down"))
      .mockResolvedValueOnce(reflectResult("interests", ["a"]));

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS });

    const bio = doc.sections.find((s) => s.key === "bio")!;
    expect(bio.text).toBe("");
    expect(bio.stale).toBe(true);
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("interests");
  });

  it("clears a section when recall finds no evidence", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(5000), createdAt: new Date(500) }),
    ]);
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

    expect(mockReflect).toHaveBeenCalledTimes(2);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("bio");
  });

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
    expect(mockReflect).toHaveBeenCalledTimes(2);
  });

  it("attributes a fact that newly entered scope (old createdAt, uncited)", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("b", { updatedAt: new Date(1000) }),
      mem("d", {
        createdAt: new Date(100),
        updatedAt: new Date(6000),
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

    expect(mockReflect).toHaveBeenCalledTimes(1);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("bio with newly in-scope fact");
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
  });

  it("reorders reused sections to the current facet order without regenerating", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["a"])],
      2000
    );

    const reversed: ProfileFacet[] = [FACETS[1], FACETS[0]];
    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: reversed, previous });

    expect(mockReflect).not.toHaveBeenCalled();
    expect(doc.sections.map((s) => s.key)).toEqual(["interests", "bio"]);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("old bio");
  });

  it("regenerates and resets the watermark when the scoped max dropped", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(2000) }),
      mem("b", { updatedAt: new Date(2000) }),
    ]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("re bio", ["a"]))
      .mockResolvedValueOnce(reflectResult("re interests", ["b"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["b"])],
      9000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(doc).not.toBe(previous);
    expect(mockReflect).toHaveBeenCalledTimes(2);
    expect(doc.vaultWatermark).toBe(2000);
  });

  it("does not publish a raw JSON payload when structured output is incomplete", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(5000), createdAt: new Date(500) }),
    ]);
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

    expect(doc.sections[0].text).toBe("");
    expect(doc.sections[0].stale).toBe(true);
  });

  it("refreshes a section when a cited fact left scope (watermark unchanged)", async () => {
    mockGetAll.mockResolvedValue([mem("b", { updatedAt: new Date(2000) })]);
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

    expect(doc).not.toBe(previous);
    expect(mockReflect).toHaveBeenCalledTimes(1);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("");
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
    expect(doc.sections[0].stale).toBeUndefined();
    expect(mockReflect).not.toHaveBeenCalled();
    expect(mockRecall).not.toHaveBeenCalled();
  });

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

    await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[0]] });

    expect(mockReflect.mock.calls[0][2]?.memories?.map((m: RankedMemory) => m.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("does not reuse an ungated prior doc once the empty gate is active", async () => {
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

  it("does not regenerate a gated facet for an unreviewed changed fact", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("b", { updatedAt: new Date(1000) }),
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
    expect(mockEmbed).not.toHaveBeenCalled();
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("old bio");
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
    expect(doc.vaultWatermark).toBe(6000);
  });

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

  it("still attributes a reviewed changed fact no section cites", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("b", { updatedAt: new Date(1000) }),
      mem("c", {
        createdAt: new Date(6000),
        updatedAt: new Date(6000),
        embedding: JSON.stringify([1, 0]),
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

    expect(mockReflect).toHaveBeenCalledTimes(1);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("bio with c");
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
  });

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

  it("measures the length caps in code points, not UTF-16 units", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    const occupation = "\u{1D518}".repeat(45);
    const interest = "\u{1D518}".repeat(25);
    expect(occupation.length).toBe(90);
    expect(interest.length).toBe(50);

    mockReflect
      .mockResolvedValueOnce(reflectResult("role prose", ["a"], true, { occupation }))
      .mockResolvedValueOnce(
        reflectResult("interests prose", ["a"], true, { interests: [interest] })
      );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE, FACETS[1]] });

    expect(doc.sections[0].occupation).toBe(occupation);
    expect(doc.sections[1].interests).toEqual([interest]);
  });

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

    expect(doc.sections[0].text).toBe("role prose");
    expect(doc.sections[0].occupation).toBeUndefined();
    expect(doc.sections[1].interests).toEqual(["film photography"]);
  });

  it("normalizes interests into a deduped, capped set", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect.mockResolvedValueOnce(
      reflectResult("prose", ["a"], true, {
        interests: [
          "Ramen",
          "  ramen ",
          "   ",
          42,
          ...Array.from({ length: 13 }, (_, i) => `hobby ${i}`),
        ],
      })
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[1]] });

    const interests = doc.sections[0].interests!;
    expect(interests).toHaveLength(12);
    expect(interests[0]).toBe("Ramen");
    expect(interests.slice(1)).toEqual(Array.from({ length: 11 }, (_, i) => `hobby ${i}`));
  });

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

  it("recovers interests emitted as a serialized array rather than splitting it", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect
      .mockResolvedValueOnce(
        reflectResult("prose", ["a"], true, {
          interests: JSON.stringify(["trail running", "film photography"]),
        })
      )
      .mockResolvedValueOnce(
        reflectResult("prose", ["a"], true, { interests: "[trail running, film photography]" })
      );

    const bracketed = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[1]] });
    const unquoted = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[1]] });

    expect(bracketed.sections[0].interests).toEqual(["trail running", "film photography"]);
    expect(unquoted.sections[0].interests).toEqual(["trail running", "film photography"]);
  });

  it("sheds serialization punctuation from near-JSON interests strings", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    const shapes = [
      '["trail running", "film photography",]',
      "['trail running', 'film photography']",
      '["trail running", "film photography"',
      '"trail running", "film photography"',
    ];

    for (const shape of shapes) {
      mockReflect.mockResolvedValueOnce(reflectResult("prose", ["a"], true, { interests: shape }));
      const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[1]] });
      expect(doc.sections[0].interests).toEqual(["trail running", "film photography"]);
    }
  });

  it("keeps an unmatched leading quote that belongs to the interest", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect.mockResolvedValueOnce(
      reflectResult("prose", ["a"], true, { interests: "'90s music, trail running" })
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[1]] });

    expect(doc.sections[0].interests).toEqual(["'90s music", "trail running"]);
  });

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

    expect(redactTextAsync.mock.calls.length).toBeLessThanOrEqual(1 + 12 * 2);
    expect(doc.sections[0].interests).toEqual(Array.from({ length: 12 }, (_, i) => `hobby ${i}`));
  });

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

  it("carries a prior section's structured values forward when regeneration fails", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(2000), createdAt: new Date(500) }),
    ]);
    mockReflect.mockRejectedValueOnce(new Error("LLM down"));

    const previous = priorDoc(
      [
        {
          ...section("work_role", "Backend engineer at a fintech startup.", ["a"]),
          occupation: "Backend engineer, fintech",
          stale: true,
        },
      ],
      2000,
      fingerprint([WORK_ROLE])
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [WORK_ROLE], previous });

    expect(doc.sections[0].occupation).toBe("Backend engineer, fintech");
    expect(doc.sections[0].stale).toBe(true);
  });

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

  it("does not reuse a doc whose facet signature predates the response schema", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("re bio", ["a"]))
      .mockResolvedValueOnce(reflectResult("re interests", ["a"]));

    const promptLines = facetsSignature(FACETS)
      .split("\n")
      .filter((line) => !Array.isArray(JSON.parse(line)));
    const legacySignature = [
      ...promptLines,
      ...FACETS.map((f) => JSON.stringify([f.key, f.label, f.query, f.guidance])).sort(),
    ].join("\n");
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

  it("does not reuse a doc whose facet signature predates the system prompt", async () => {
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("re bio", ["a"]))
      .mockResolvedValueOnce(reflectResult("re interests", ["a"]));

    const legacySignature = facetsSignature(FACETS)
      .split("\n")
      .filter((line) => Array.isArray(JSON.parse(line)))
      .join("\n");
    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old interests", ["a"])],
      2000,
      { ...cfg(), facetsSignature: legacySignature }
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(doc).not.toBe(previous);
    expect(mockReflect).toHaveBeenCalledTimes(2);
  });

  it("asks for a pronoun-free voice, never third person", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect.mockResolvedValue(reflectResult("Values clear communication.", ["a"]));

    await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS });

    for (const call of mockReflect.mock.calls) {
      const systemPrompt = call[2]?.systemPrompt ?? "";
      expect(systemPrompt).toContain("pronoun-free profile voice");
      expect(systemPrompt).not.toContain("third person");
    }
  });
});
