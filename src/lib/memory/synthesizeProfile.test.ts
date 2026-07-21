import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./reflect.js", () => ({ reflect: vi.fn() }));
vi.mock("../db/memoryVault/operations.js", () => ({ getAllVaultMemoriesOp: vi.fn() }));

import { getAllVaultMemoriesOp } from "../db/memoryVault/operations.js";
import type { StoredVaultMemory } from "../db/memoryVault/types.js";
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

// vaultCtx just needs to be a truthy object — the ops are mocked.
const ctx = {
  embeddingOptions: { apiKey: "k" },
  vaultCtx: {},
} as unknown as RecallContext;

const FACETS: ProfileFacet[] = [
  { key: "bio", label: "Bio", query: "who", guidance: "g" },
  { key: "interests", label: "Interests", query: "what", guidance: "g" },
];

/** The config fingerprint FACETS + default scopes produce (unredacted). */
function cfg(redacted = false): ProfileConfigFingerprint {
  return { facetKeys: ["bio", "interests"], scopes: ["private"], redacted };
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

  it("regenerates all facets when a brand-new fact appeared", async () => {
    mockGetAll.mockResolvedValue([
      mem("a", { updatedAt: new Date(1000) }),
      mem("c", { updatedAt: new Date(6000), createdAt: new Date(6000) }), // new
    ]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("new bio", ["a", "c"]))
      .mockResolvedValueOnce(reflectResult("new interests", ["c"]));

    const previous = priorDoc(
      [section("bio", "old bio", ["a"]), section("interests", "old", ["b"])],
      2000
    );

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(mockReflect).toHaveBeenCalledTimes(2);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("new bio");
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

    const previous = priorDoc([section("bio", "good old bio", ["a"])], 2000, {
      facetKeys: ["bio"],
      scopes: ["private"],
      redacted: false,
    });

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
    mockGetAll.mockResolvedValue([mem("a", { updatedAt: new Date(2000) })]);
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

    const previous = priorDoc([section("bio", "old bio", ["a"])], 2000, {
      facetKeys: ["bio"],
      scopes: ["private"],
      redacted: false,
    });

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: [FACETS[0]], previous });

    expect(doc.sections[0].text).toBe("");
    expect(doc.sections[0].stale).toBeFalsy();
  });
});
