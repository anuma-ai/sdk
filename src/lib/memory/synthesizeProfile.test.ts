import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./reflect.js", () => ({ reflect: vi.fn() }));
vi.mock("../db/memoryVault/operations.js", () => ({ getAllVaultMemoriesOp: vi.fn() }));

import { getAllVaultMemoriesOp } from "../db/memoryVault/operations.js";
import type { StoredVaultMemory } from "../db/memoryVault/types.js";
import { reflect } from "./reflect.js";
import {
  type ProfileDoc,
  type ProfileFacet,
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

function mem(id: string, opts: Partial<StoredVaultMemory> = {}): StoredVaultMemory {
  const now = opts.updatedAt ?? new Date(1000);
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
    supersededBy: null,
    supersededAt: null,
    lastObservedAt: null,
    createdAt: opts.createdAt ?? new Date(500),
    updatedAt: now,
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("synthesizeProfile", () => {
  it("throws without a vault context", async () => {
    await expect(
      synthesizeProfile({ embeddingOptions: { apiKey: "k" } } as RecallContext)
    ).rejects.toThrow(/vaultCtx/);
  });

  it("synthesizes one section per facet, carrying source ids + watermark", async () => {
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
    expect(mockReflect).toHaveBeenCalledTimes(2);
  });

  it("collapses a section to empty text when the facet has no evidence", async () => {
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
    const previous: ProfileDoc = {
      version: PROFILE_DOC_VERSION,
      sections: [
        { key: "bio", label: "Bio", text: "old bio", sourceMemoryIds: ["a"], generatedAt: 1 },
        {
          key: "interests",
          label: "Interests",
          text: "old",
          sourceMemoryIds: ["a"],
          generatedAt: 1,
        },
      ],
      vaultWatermark: 2000,
      generatedAt: 1,
    };

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(doc).toBe(previous);
    expect(mockReflect).not.toHaveBeenCalled();
  });

  it("delta-refreshes only facets whose cited facts changed (no new facts)", async () => {
    // Watermark advanced to 5000 (fact "a" edited); "b" unchanged.
    mockGetAll
      .mockResolvedValueOnce([
        mem("a", { updatedAt: new Date(5000) }),
        mem("b", { updatedAt: new Date(1000) }),
      ]) // computeVaultWatermark
      .mockResolvedValueOnce([mem("a", { updatedAt: new Date(5000), createdAt: new Date(500) })]); // changed-since (edit, not new)
    mockReflect.mockResolvedValueOnce(reflectResult("fresh bio", ["a"]));

    const previous: ProfileDoc = {
      version: PROFILE_DOC_VERSION,
      sections: [
        { key: "bio", label: "Bio", text: "old bio", sourceMemoryIds: ["a"], generatedAt: 1 },
        {
          key: "interests",
          label: "Interests",
          text: "old interests",
          sourceMemoryIds: ["b"],
          generatedAt: 1,
        },
      ],
      vaultWatermark: 2000,
      generatedAt: 1,
    };

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    // Only bio (cited "a", which changed) regenerated; interests reused verbatim.
    expect(mockReflect).toHaveBeenCalledTimes(1);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("fresh bio");
    expect(doc.sections.find((s) => s.key === "interests")!.text).toBe("old interests");
    expect(doc.vaultWatermark).toBe(5000);
  });

  it("regenerates all facets when a brand-new fact appeared", async () => {
    mockGetAll
      .mockResolvedValueOnce([
        mem("a", { updatedAt: new Date(1000) }),
        mem("c", { updatedAt: new Date(6000) }),
      ])
      .mockResolvedValueOnce([mem("c", { updatedAt: new Date(6000), createdAt: new Date(6000) })]); // new fact
    mockReflect
      .mockResolvedValueOnce(reflectResult("new bio", ["a", "c"]))
      .mockResolvedValueOnce(reflectResult("new interests", ["c"]));

    const previous: ProfileDoc = {
      version: PROFILE_DOC_VERSION,
      sections: [
        { key: "bio", label: "Bio", text: "old bio", sourceMemoryIds: ["a"], generatedAt: 1 },
        {
          key: "interests",
          label: "Interests",
          text: "old",
          sourceMemoryIds: ["b"],
          generatedAt: 1,
        },
      ],
      vaultWatermark: 2000,
      generatedAt: 1,
    };

    const doc = await synthesizeProfile(ctx, { apiKey: "k", facets: FACETS, previous });

    expect(mockReflect).toHaveBeenCalledTimes(2);
    expect(doc.sections.find((s) => s.key === "bio")!.text).toBe("new bio");
  });

  it("runs fresh section text through the PII redactor gate", async () => {
    mockGetAll.mockResolvedValue([mem("a")]);
    mockReflect
      .mockResolvedValueOnce(reflectResult("Bio with email x@y.com", ["a"]))
      .mockResolvedValueOnce(reflectResult("", [], false));
    const redactTextAsync = vi
      .fn()
      .mockResolvedValue({ text: "Bio with email [EMAIL_1]", matches: [] });

    const doc = await synthesizeProfile(ctx, {
      apiKey: "k",
      facets: FACETS,
      redactor: { redactTextAsync } as never,
    });

    expect(redactTextAsync).toHaveBeenCalledTimes(1); // only the non-empty section
    expect(doc.sections[0].text).toBe("Bio with email [EMAIL_1]");
  });
});
