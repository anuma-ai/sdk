import { getAllVaultMemoriesOp } from "../db/memoryVault/operations.js";
import type { StoredVaultMemory } from "../db/memoryVault/types.js";
import { withInternalFlowMarker } from "../internalFlowMarker.js";
import { getLogger } from "../logger.js";
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants.js";
import { generateEmbeddings } from "../memoryEngine/embeddings.js";
import { cosineSimilarity } from "../memoryEngine/vector.js";
import type { PiiRedactor } from "../pii/redactor.js";
import type { FactType } from "./autoExtract.js";
import { type ObservationTrend, summarizeObservationTrends } from "./observationTrend.js";
import type { PortalLlmAuth } from "./portalLlm.js";
import {
  DEFAULT_PROFILE_FACT_TYPE_WEIGHTS,
  DEFAULT_PROFILE_PROOF_ALPHA,
} from "./profileSalience.js";
import { recall } from "./recall.js";
import { RECALL_MAX_LIMIT } from "./recallConstants.js";
import { reflect } from "./reflect.js";
import type { RankedMemory, RecallContext } from "./types.js";

const DEFAULT_SYNTHESIS_MODEL = "inclusionai/ling-2.6-flash";
const DEFAULT_FACET_RECALL_LIMIT = 20;
const DEFAULT_FACET_MAX_TOKENS = 512;
const DEFAULT_SCOPES = ["private"];
const NEW_FACT_ATTRIBUTION_MIN_SCORE = 0.1;
/** Bump when the ProfileDoc / section shape changes incompatibly. */
export const PROFILE_DOC_VERSION = 1;

/** The facets a profile decomposes into (dating-app-style, per the People
 * Nearby plan). Configurable via {@link SynthesizeProfileOptions.facets}. */
export type ProfileFacetKey =
  | "bio"
  | "interests"
  | "work_role"
  | "location_context"
  | "communication_style"
  | "recent_activity";

/** One profile facet: how to recall its evidence and steer its synthesis. */
export interface ProfileFacet {
  key: ProfileFacetKey;
  /** Human-readable section label. */
  label: string;
  /** Recall query that pulls the vault facts relevant to this facet. */
  query: string;
  /** Facet-specific guidance appended to the synthesis system prompt. */
  guidance: string;
}

/** Default dating-app facet set. Order is display order. */
export const DEFAULT_PROFILE_FACETS: ProfileFacet[] = [
  {
    key: "bio",
    label: "Bio",
    query: "Who is this person? Their background, personality, values, and what defines them.",
    guidance:
      "Write a 1-2 sentence bio (max ~40 words) that captures what makes this person distinctive — their character, values, or a defining thread across the memories. Be specific and grounded; ban generic dating clichés ('loves to laugh', 'foodie', 'work hard play hard', 'living life to the fullest').",
  },
  {
    key: "interests",
    label: "Interests",
    query: "What are this person's hobbies, passions, pastimes, and interests?",
    guidance:
      "Return 3-6 specific interests as a comma-separated list (e.g. 'trail running, film photography, Thai cooking'). Prefer concrete activities the memories actually show over broad categories ('music', 'travel'). No sentence, just the list.",
  },
  {
    key: "work_role",
    label: "Work & Role",
    query: "What does this person do for work — their profession, role, industry, or studies?",
    guidance:
      "State the person's current role/profession and field in one short line (e.g. 'Backend engineer at a fintech startup'). Use only what the memories support; if unclear or absent, return hasEvidence=false rather than guessing a title.",
  },
  {
    key: "location_context",
    label: "Location",
    query: "Where does this person live, spend time, or come from?",
    guidance:
      "Summarize where the person is based or spends time at neighborhood-or-city granularity in one short line (e.g. 'Based in the Mission, SF'). PRIVACY: never emit a precise address, building, or workplace location — coarse-grain to the city/neighborhood.",
  },
  {
    key: "communication_style",
    label: "Communication Style",
    query: "How does this person communicate, express themselves, and interact with others?",
    guidance:
      "Describe the person's communication and social style in one line using 2-4 concrete adjectives grounded in the memories (e.g. 'Direct, dry-humored, and a careful listener'). Avoid empty praise.",
  },
  {
    key: "recent_activity",
    label: "Recently",
    query: "What has this person been doing, focused on, or working on recently?",
    guidance:
      "Summarize what the person has been up to lately in one line, favoring the most recently reinforced facts. Frame it as current/ongoing (e.g. 'Lately: training for a first half-marathon and learning Portuguese'). Omit if nothing recent stands out.",
  },
];

const NEARBY_MAX_OCCUPATION_CODEPOINTS = 80;
const NEARBY_MAX_INTERESTS = 12;
const NEARBY_MAX_INTEREST_CODEPOINTS = 40;

const MAX_RAW_INTERESTS = NEARBY_MAX_INTERESTS * 2;

function codePointLength(value: string): number {
  return [...value].length;
}

const FACET_BASE_PROPERTIES: Record<string, unknown> = {
  summary: {
    type: "string",
    description: "The synthesized section prose. Empty string if the memories don't cover it.",
  },
  hasEvidence: {
    type: "boolean",
    description: "False when the supplied memories don't support any claim for this facet.",
  },
};

const FACET_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: FACET_BASE_PROPERTIES,
  required: ["summary", "hasEvidence"],
  additionalProperties: false,
};

const WORK_ROLE_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    ...FACET_BASE_PROPERTIES,
    occupation: {
      type: "string",
      description: `The same role as a standalone phrase for a profile field, at most ${NEARBY_MAX_OCCUPATION_CODEPOINTS} characters (e.g. "Backend engineer, fintech"). Empty string when hasEvidence is false.`,
    },
  },
  required: ["summary", "hasEvidence", "occupation"],
  additionalProperties: false,
};

const INTERESTS_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    ...FACET_BASE_PROPERTIES,
    interests: {
      type: "array",
      items: { type: "string" },
      description: `The same interests as discrete strings — at most ${NEARBY_MAX_INTERESTS} items, each at most ${NEARBY_MAX_INTEREST_CODEPOINTS} characters (e.g. ["trail running", "film photography"]). Empty array when hasEvidence is false.`,
    },
  },
  required: ["summary", "hasEvidence", "interests"],
  additionalProperties: false,
};

function facetResponseSchema(key: ProfileFacetKey): Record<string, unknown> {
  if (key === "work_role") return WORK_ROLE_RESPONSE_SCHEMA;
  if (key === "interests") return INTERESTS_RESPONSE_SCHEMA;
  return FACET_RESPONSE_SCHEMA;
}

const FACET_STRUCTURED_RESPONSE_HINT: Partial<Record<ProfileFacetKey, string>> = {
  work_role: `, "occupation": <the role as a standalone phrase of at most ${NEARBY_MAX_OCCUPATION_CODEPOINTS} characters, e.g. "Backend engineer, fintech", or "">`,
  interests: `, "interests": <the same interests as an array of at most ${NEARBY_MAX_INTERESTS} strings of at most ${NEARBY_MAX_INTEREST_CODEPOINTS} characters each, e.g. ["trail running", "film photography"], or []>`,
};

/** A synthesized profile section, grounded in specific vault facts. */
export interface ProfileSection {
  key: ProfileFacetKey;
  label: string;
  /** Synthesized prose (PII-redacted when a redactor is supplied). Empty when
   * the vault has no evidence for this facet. */
  text: string;
  /** Vault memory ids this section was grounded on — provenance + delta refresh. */
  sourceMemoryIds: string[];
  /**
   * Structured occupation — the `work_role` facet only. A short role phrase
   * (at most 80 code points, PII-gated alongside {@link ProfileSection.text})
   * that a profile store's `occupation` column takes verbatim.
   *
   * Absent when the facet found no evidence, when the model didn't return one,
   * or when the value it returned couldn't be made publishable. `text` is
   * unaffected either way, so the prose is never blocked on this.
   */
  occupation?: string;
  /**
   * Structured interests — the `interests` facet only. Discrete entries,
   * trimmed and deduped case- and space-insensitively (first spelling wins), at
   * most 12 items of at most 40 code points each, ready for a profile store's
   * `interests` column. Absent when nothing survived normalization.
   */
  interests?: string[];
  /** Unix ms this section was generated. */
  generatedAt: number;
  /** True when regeneration failed (e.g. LLM returned empty) — the caller may choose to retry. */
  stale?: boolean;
}

/** Fingerprint of the config that produced a {@link ProfileDoc}. Delta reuse
 * (both the wholesale fast path and per-section reuse) is only valid when the
 * current call's config matches — otherwise reused sections could carry the
 * wrong scope's evidence, un-redacted text under a now-present redactor, an
 * old section shape, or text grounded in memory ids that are no longer in the
 * publish-review set. */
export interface ProfileConfigFingerprint {
  /** Facet keys present in the doc, sorted. */
  facetKeys: ProfileFacetKey[];
  /** Order-independent digest of each facet's full definition (key + label +
   * query + guidance) and the response schema it is synthesized under. Reuse
   * must invalidate when a facet's PROMPT changes, not just its key set —
   * otherwise reused sections carry text generated under the old definition,
   * or under an output schema that predates a field the caller now reads.
   * Facet display order does NOT invalidate (sections are rebuilt in facet
   * order and reused by key). */
  facetsSignature: string;
  /** Scopes the facts were drawn from, sorted. */
  scopes: string[];
  /** Whether a PII redactor gated the section text. Reusing un-gated text under
   * a now-present redactor would leak PII, so this flips the fingerprint. */
  redacted: boolean;
  /**
   * Order-independent digest of {@link SynthesizeProfileOptions.reviewedMemoryIds}.
   * Empty string when the review gate is off (omit / empty array). Changing the
   * set must invalidate reuse — otherwise a narrowed review keeps text grounded
   * in unreviewed ids, and a widened review leaves previously-cleared sections
   * empty.
   */
  reviewedMemoryIdsSignature: string;
}

/** A synthesized profile. Server-authoritative once published; the client
 * caches it and passes it back as {@link SynthesizeProfileOptions.previous}. */
export interface ProfileDoc {
  /** {@link PROFILE_DOC_VERSION} at synthesis time. */
  version: number;
  /** One section per requested facet (in facet order). */
  sections: ProfileSection[];
  /** Max change-time across all vault facts (incl. deleted/superseded) at
   * synthesis time. Delta refresh regenerates only sections whose source facts
   * changed since a previous doc's watermark. */
  vaultWatermark: number;
  /** The config that produced this doc — see {@link ProfileConfigFingerprint}. */
  config: ProfileConfigFingerprint;
  /**
   * C2 — counts of observation-trend labels over live vault facts at
   * synthesis time. Lets People Nearby surface "interests trending up"
   * without another LLM pass. Recomputed every synthesis (not delta-cached).
   */
  observationTrends: Record<ObservationTrend, number>;
  /** Unix ms this doc was produced. */
  generatedAt: number;
}

/** Options for {@link synthesizeProfile}. Auth is the dual {@link PortalLlmAuth}
 * pattern — one of `apiKey` / `getToken` is required at runtime. */
export interface SynthesizeProfileOptions extends PortalLlmAuth {
  /** Facets to synthesize. Defaults to {@link DEFAULT_PROFILE_FACETS}. */
  facets?: ProfileFacet[];
  /** Prior doc for delta refresh. Unchanged sections are reused verbatim. */
  previous?: ProfileDoc;
  /** Synthesis model. Default: open-weights ling-2.6-flash. */
  llmModel?: string;
  /** LLM endpoint override. */
  baseUrl?: string;
  /** Scopes to draw facts from. Default: ["private"]. */
  scopes?: string[];
  /** Facts recalled per facet before synthesis. Default: 20. */
  limit?: number;
  /** Override fetch (tests). */
  fetchFn?: typeof fetch;
  /** Pre-publish PII gate. When supplied, each section's text is run through
   * {@link PiiRedactor.redactTextAsync} (regex + NER) before it's returned.
   * Omit only when the caller redacts downstream — `nearby` also moderates
   * server-side, but the client should never publish un-gated text. */
  redactor?: PiiRedactor;
  /**
   * Per-FactType score multipliers for facet recall. Default:
   * {@link DEFAULT_PROFILE_FACT_TYPE_WEIGHTS} (durable types boosted).
   * Does not change global chat `recall()` defaults.
   */
  factTypeWeights?: Partial<Record<FactType, number>>;
  /**
   * Proof-count α for facet recall. Default: {@link DEFAULT_PROFILE_PROOF_ALPHA}
   * (0.2). Chat recall stays at 0.1.
   */
  proofCountAlpha?: number;
  /**
   * Publish-review gate: when SUPPLIED, each facet's recalled evidence is
   * intersected with this id set before the LLM runs, so synthesis can only draw
   * on memories the user approved for publication. Empty intersection → empty
   * section (legitimate no-evidence), not a stale fallback.
   *
   * Pass the user's published set (e.g. `getAllVaultMemoriesOp(ctx, { levels:
   * ["matching", "profile"] })`) to keep a published profile derivable only from published
   * memories — People Nearby's two-tier model treats `private` memories as never
   * leaving the device, and a summary derived from them is a derivative that does.
   *
   * `[]` means "nothing approved" and gates everything OUT (no recall, no LLM
   * call, empty sections). **Omitting the field is the only way to run ungated**
   * — that asymmetry is deliberate, so a caller computing a published set can
   * never accidentally disable the gate by finding it empty.
   */
  reviewedMemoryIds?: readonly string[];
}

/**
 * Synthesize a shareable {@link ProfileDoc} from the user's vault, on-device.
 *
 * Stateless: pass `options.previous` to reuse unchanged sections (delta refresh)
 * and the caller persists the result. On per-facet LLM failure the section
 * falls back to its prior value (marked `stale`) or an empty section.
 */
export async function synthesizeProfile(
  ctx: RecallContext,
  options: SynthesizeProfileOptions = {}
): Promise<ProfileDoc> {
  if (!ctx.vaultCtx) {
    throw new Error("synthesizeProfile requires ctx.vaultCtx (vault-backed facts).");
  }
  if (!ctx.vaultCache) {
    throw new Error("synthesizeProfile requires ctx.vaultCache (semantic fact recall).");
  }
  const facets = options.facets ?? DEFAULT_PROFILE_FACETS;
  const scopes = options.scopes ?? DEFAULT_SCOPES;
  const config: ProfileConfigFingerprint = {
    facetKeys: facets.map((f) => f.key).sort(),
    facetsSignature: facetsSignature(facets),
    scopes: [...scopes].sort(),
    redacted: options.redactor !== undefined,
    reviewedMemoryIdsSignature: reviewedMemoryIdsSignature(options.reviewedMemoryIds),
  };

  const previous =
    options.previous &&
    options.previous.version === PROFILE_DOC_VERSION &&
    configMatches(options.previous.config, config)
      ? options.previous
      : undefined;

  const memories = await getAllVaultMemoriesOp(ctx.vaultCtx, {
    scopes,
    includeDeleted: true,
    includeSuperseded: true,
  });
  const watermark = computeVaultWatermark(memories);
  const observationTrends = summarizeObservationTrends(
    memories
      .filter((m) => !m.isDeleted && m.supersededBy === null)
      .map((m) => ({
        createdAt: m.createdAt,
        lastObservedAt: m.lastObservedAt,
        proofCount: m.proofCount,
      }))
  );

  const presentIds = new Set(memories.map((m) => m.uniqueId));
  const hasStaleSections = previous?.sections.some((s) => s.stale);
  const citesMissingFact = previous?.sections.some((s) =>
    s.sourceMemoryIds.some((id) => !presentIds.has(id))
  );
  if (previous && previous.vaultWatermark === watermark && !hasStaleSections && !citesMissingFact) {
    const sameOrder =
      previous.sections.length === facets.length &&
      facets.every((f, i) => previous.sections[i]?.key === f.key);
    if (sameOrder) {
      if (trendsEqual(previous.observationTrends, observationTrends)) return previous;
      return { ...previous, observationTrends };
    }
    return {
      ...previous,
      sections: facets.map((f) => previous.sections.find((s) => s.key === f.key)!),
      observationTrends,
    };
  }

  const staleKeys = await computeStaleFacetKeys(
    ctx,
    memories,
    facets,
    previous,
    watermark,
    options.reviewedMemoryIds
  );

  const memoriesById = new Map(memories.map((memory) => [memory.uniqueId, memory]));
  const fallbackPriors = new Map<ProfileFacetKey, ProfileSection>();
  if (previous) {
    for (const section of previous.sections) {
      if (
        section.sourceMemoryIds.length > 0 &&
        section.sourceMemoryIds.every((id) => {
          const memory = memoriesById.get(id);
          return (
            memory &&
            !memory.isDeleted &&
            !memory.supersededBy &&
            scopes.includes(memory.scope) &&
            (options.reviewedMemoryIds === undefined || options.reviewedMemoryIds.includes(id)) &&
            changeTime(memory) <= previous.vaultWatermark
          );
        })
      ) {
        fallbackPriors.set(section.key, section);
      }
    }
  }

  const settled = await Promise.allSettled(
    facets.map(async (facet) => {
      const prior = previous?.sections.find((s) => s.key === facet.key);
      if (prior && !staleKeys.has(facet.key)) {
        return prior;
      }
      return synthesizeFacet(facet, ctx, options, fallbackPriors.get(facet.key));
    })
  );

  const sections = settled.map((r, i) => {
    if (r.status === "fulfilled") return r.value;
    const facet = facets[i];
    getLogger().warn(
      "[memory/synthesizeProfile] facet synthesis rejected; using fallback section",
      {
        facet: facet.key,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      }
    );
    return fallbackSection(facet, fallbackPriors.get(facet.key));
  });

  return {
    version: PROFILE_DOC_VERSION,
    sections,
    vaultWatermark: watermark,
    config,
    observationTrends,
    generatedAt: Date.now(),
  };
}

function configMatches(
  a: ProfileConfigFingerprint | undefined,
  b: ProfileConfigFingerprint
): boolean {
  if (!a) return false;
  return (
    a.redacted === b.redacted &&
    a.facetsSignature === b.facetsSignature &&
    (a.reviewedMemoryIdsSignature ?? "") === b.reviewedMemoryIdsSignature &&
    a.scopes.length === b.scopes.length &&
    a.scopes.every((s, i) => s === b.scopes[i])
  );
}

function reviewedMemoryIdsSignature(ids: readonly string[] | undefined): string {
  if (ids === undefined) return "";
  if (ids.length === 0) return "\u0000gated-empty";
  return [...new Set(ids)].sort().join("\n");
}

/**
 * Order-independent digest of the facet definitions — key + label + query +
 * guidance — plus the response schema each facet resolves to. Sorted so facet
 * reordering (handled by the facet-order map) doesn't invalidate reuse, but any
 * prompt/label change does.
 *
 * The schema belongs in here rather than beside it: `reflect` embeds it
 * verbatim in the system prompt for every model outside its `json_schema`
 * allowlist — which includes the default synthesis model — so a schema edit
 * changes what the model was asked for exactly the way a guidance edit does. If
 * it didn't invalidate, a section synthesized under the old schema would keep
 * being reused forever, because delta refresh only revisits facets whose FACTS
 * changed; adding a field to the output shape would silently never reach anyone
 * with a cached doc. Folding it in also makes the NEXT schema edit
 * self-invalidating, instead of depending on someone remembering to bump
 * {@link PROFILE_DOC_VERSION} (which stays reserved for genuine breaks — this
 * is an additive, optional-field change, and existing docs stay readable).
 *
 * Every facet folds in a schema, including the ones whose schema didn't change,
 * so introducing this invalidates EVERY cached doc once — not just the facet
 * sets containing work_role or interests. That's deliberate: making the fold
 * conditional on "differs from the prose schema" would buy a narrower one-time
 * cost and give back the guarantee, since a later edit to the shared prose
 * schema would then invalidate nothing at all.
 *
 * {@link FACET_SYSTEM_PROMPT} is folded in on the same argument. It is shared by
 * every facet, so leaving it out meant a rules edit (the third-person voice line,
 * ai-memoryless-client#8398) reached no one with a cached doc until their facts
 * happened to change.
 *
 * Not exported through the barrels; `synthesizeProfile.test.ts` consumes it so
 * the test builds prior-doc fingerprints from the real algorithm rather than a
 * mirror of it — the schemas it folds in are module-private and a hand-copied
 * mirror would rot into "everything regenerates" test noise.
 */
export function facetsSignature(facets: ProfileFacet[]): string {
  return [
    JSON.stringify(FACET_SYSTEM_PROMPT),
    ...facets
      .map((f) => JSON.stringify([f.key, f.label, f.query, f.guidance, facetResponseSchema(f.key)]))
      .sort(),
  ].join("\n");
}

function trendsEqual(
  a: Record<ObservationTrend, number> | undefined,
  b: Record<ObservationTrend, number>
): boolean {
  if (!a) return false;
  return (
    a.new === b.new &&
    a.strengthening === b.strengthening &&
    a.stable === b.stable &&
    a.weakening === b.weakening &&
    a.stale === b.stale
  );
}

function changeTime(m: StoredVaultMemory): number {
  return Math.max(m.updatedAt.getTime(), m.supersededAt ?? 0, m.lastObservedAt ?? 0);
}

function computeVaultWatermark(memories: StoredVaultMemory[]): number {
  let max = 0;
  for (const m of memories) {
    const t = changeTime(m);
    if (t > max) max = t;
  }
  return max;
}

async function computeStaleFacetKeys(
  ctx: RecallContext,
  memories: StoredVaultMemory[],
  facets: ProfileFacet[],
  previous: ProfileDoc | undefined,
  watermark: number,
  reviewedMemoryIds: readonly string[] | undefined
): Promise<Set<ProfileFacetKey>> {
  const allKeys = new Set(facets.map((f) => f.key));
  if (previous && watermark < previous.vaultWatermark) return allKeys;
  if (!previous) return allKeys;

  const changed = memories.filter((m) => changeTime(m) > previous.vaultWatermark);
  const changedIds = new Set(changed.map((m) => m.uniqueId));
  const presentIds = new Set(memories.map((m) => m.uniqueId));
  const stale = new Set<ProfileFacetKey>();

  for (const section of previous.sections) {
    if (section.sourceMemoryIds.some((id) => changedIds.has(id))) {
      stale.add(section.key);
    }
    if (section.sourceMemoryIds.some((id) => !presentIds.has(id))) {
      stale.add(section.key);
    }
    if (section.stale) {
      stale.add(section.key);
    }
  }
  for (const facet of facets) {
    if (!previous.sections.some((s) => s.key === facet.key)) stale.add(facet.key);
  }

  const citedIds = new Set(previous.sections.flatMap((s) => s.sourceMemoryIds));
  let toAttribute = changed.filter(
    (m) => !m.isDeleted && !m.supersededBy && !citedIds.has(m.uniqueId)
  );
  if (reviewedMemoryIds !== undefined) {
    const allowed = new Set(reviewedMemoryIds);
    toAttribute = toAttribute.filter((m) => allowed.has(m.uniqueId));
  }
  if (toAttribute.length > 0) {
    const attributed = await attributeFacts(ctx, toAttribute, facets);
    if (attributed === null) return allKeys;
    for (const k of attributed) stale.add(k);
  }

  return stale;
}

async function attributeFacts(
  ctx: RecallContext,
  candidates: StoredVaultMemory[],
  facets: ProfileFacet[]
): Promise<Set<ProfileFacetKey> | null> {
  const model = ctx.embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;
  const factVectors: number[][] = [];
  for (const f of candidates) {
    if (!f.embedding || (f.embeddingModel && f.embeddingModel !== model)) {
      getLogger().warn(
        "[memory/synthesizeProfile] fact lacks a usable current-model embedding; regenerating all facets",
        { memoryId: f.uniqueId, hasEmbedding: !!f.embedding, embeddingModel: f.embeddingModel }
      );
      return null;
    }
    let vec: unknown;
    try {
      vec = JSON.parse(f.embedding);
    } catch {
      getLogger().warn(
        "[memory/synthesizeProfile] fact embedding failed to parse; regenerating all facets",
        { memoryId: f.uniqueId }
      );
      return null;
    }
    if (!Array.isArray(vec) || vec.length === 0) return null;
    factVectors.push(vec as number[]);
  }

  let queryVectors: number[][];
  try {
    queryVectors = await generateEmbeddings(
      facets.map((f) => f.query),
      ctx.embeddingOptions
    );
  } catch (err) {
    getLogger().warn(
      "[memory/synthesizeProfile] facet-query embedding failed; regenerating all facets",
      { error: err instanceof Error ? err.message : String(err) }
    );
    return null;
  }

  const keys = new Set<ProfileFacetKey>();
  for (const fv of factVectors) {
    let matchedAny = false;
    for (let i = 0; i < facets.length; i++) {
      if (cosineSimilarity(fv, queryVectors[i]) >= NEW_FACT_ATTRIBUTION_MIN_SCORE) {
        keys.add(facets[i].key);
        matchedAny = true;
      }
    }
    if (!matchedAny) return null;
  }
  return keys;
}

async function synthesizeFacet(
  facet: ProfileFacet,
  ctx: RecallContext,
  options: SynthesizeProfileOptions,
  prior: ProfileSection | undefined
): Promise<ProfileSection> {
  const scopes = options.scopes ?? DEFAULT_SCOPES;
  const limit = options.limit ?? DEFAULT_FACET_RECALL_LIMIT;
  const factTypeWeights = { ...DEFAULT_PROFILE_FACT_TYPE_WEIGHTS, ...options.factTypeWeights };
  const proofCountAlpha = options.proofCountAlpha ?? DEFAULT_PROFILE_PROOF_ALPHA;

  const reviewed = options.reviewedMemoryIds;
  const hasReviewGate = reviewed !== undefined;
  if (hasReviewGate && reviewed.length === 0) {
    return {
      key: facet.key,
      label: facet.label,
      text: "",
      sourceMemoryIds: [],
      generatedAt: Date.now(),
    };
  }

  const recalled = await recall(facet.query, ctx, {
    scopes,
    limit: hasReviewGate ? RECALL_MAX_LIMIT : limit,
    types: ["fact"],
    factTypeWeights,
    proofCountAlpha,
  });

  let memories: RankedMemory[] = recalled.memories;
  if (hasReviewGate) {
    const allowed = new Set(reviewed);
    memories = memories.filter((m) => allowed.has(m.id)).slice(0, limit);
  }

  if (memories.length === 0) {
    return {
      key: facet.key,
      label: facet.label,
      text: "",
      sourceMemoryIds: [],
      generatedAt: Date.now(),
    };
  }

  const result = await reflect(facet.query, ctx, {
    apiKey: options.apiKey,
    getToken: options.getToken,
    llmModel: options.llmModel ?? DEFAULT_SYNTHESIS_MODEL,
    baseUrl: options.baseUrl,
    fetchFn: options.fetchFn,
    scopes,
    limit,
    types: ["fact"],
    maxTokens: DEFAULT_FACET_MAX_TOKENS,
    taskType: "memory_profile_synth",
    systemPrompt: withInternalFlowMarker(FACET_SYSTEM_PROMPT),
    userInstructions: buildFacetUserInstructions(facet),
    responseSchema: facetResponseSchema(facet.key),
    memories,
  });

  const noEvidence = result.basedOn.memoryIds.length === 0;
  const { text, legitimateEmpty } = extractFacetText(result.structuredOutput);

  if (!text && !legitimateEmpty && !noEvidence) {
    getLogger().warn(
      "[memory/synthesizeProfile] facet synthesis returned degraded-empty; using fallback section",
      { facet: facet.key, recalledCount: result.basedOn.memoryIds.length }
    );
    return fallbackSection(facet, prior);
  }

  const section: ProfileSection = {
    key: facet.key,
    label: facet.label,
    text,
    sourceMemoryIds: result.basedOn.memoryIds,
    generatedAt: Date.now(),
  };
  if (options.redactor && text) {
    const redacted = await options.redactor.redactTextAsync(text);
    section.text = redacted.text;
  }

  if (!legitimateEmpty && !noEvidence) {
    const values = extractStructuredValues(facet.key, result.structuredOutput);
    if (options.redactor) {
      if (values.occupation) {
        values.occupation = (await options.redactor.redactTextAsync(values.occupation)).text;
      }
      if (values.interests) {
        const gated: string[] = [];
        for (const interest of values.interests) {
          gated.push((await options.redactor.redactTextAsync(interest)).text);
        }
        values.interests = gated;
      }
    }
    const occupation = normalizeOccupation(values.occupation);
    if (occupation !== undefined) section.occupation = occupation;
    const interests = normalizeInterests(values.interests);
    if (interests !== undefined) section.interests = interests;
  }

  return section;
}

function fallbackSection(facet: ProfileFacet, prior: ProfileSection | undefined): ProfileSection {
  if (prior && prior.text) {
    return { ...prior, stale: true };
  }
  return {
    key: facet.key,
    label: facet.label,
    text: "",
    sourceMemoryIds: [],
    generatedAt: Date.now(),
    stale: true,
  };
}

const FACET_SYSTEM_PROMPT = `You are writing one section of a person's shareable profile, using their private memories (supplied as evidence) as the only source of truth. The user turn names the section, states the task for it, and gives the exact JSON shape to respond in.

Rules:
- Ground every claim in the supplied memories — never invent, infer beyond, or embellish what they support.
- If the memories don't cover this section, return an empty summary with hasEvidence=false. Do not pad or guess.
- Write in a pronoun-free profile voice: lead with the descriptor or the verb ("Thoughtful, detail-oriented builder. Values clear communication."). Never use "they"/"he"/"she", "I", "you", or the person's name — the person publishes this as their own profile, and strangers read it there.
- Be concise and specific; no preamble, hedging, or meta-commentary.
- Respond as JSON in exactly the shape the user turn states, with no extra fields.`;

function buildFacetUserInstructions(facet: ProfileFacet): string {
  const structuredField = FACET_STRUCTURED_RESPONSE_HINT[facet.key] ?? "";
  return `Section: "${facet.label}"

Task for this section:
${facet.guidance}

Respond as JSON: { "summary": <the section text, or "">, "hasEvidence": <true|false>${structuredField} }.`;
}

function extractFacetText(structured: unknown): { text: string; legitimateEmpty: boolean } {
  if (structured && typeof structured === "object") {
    const obj = structured as { summary?: unknown; hasEvidence?: unknown };
    if (obj.hasEvidence === false) return { text: "", legitimateEmpty: true };
    if (typeof obj.summary === "string")
      return { text: obj.summary.trim(), legitimateEmpty: false };
  }
  return { text: "", legitimateEmpty: false };
}

/** A facet's structured attributes. Only the owning facet ever fills its field. */
interface FacetStructuredValues {
  occupation?: string;
  interests?: string[];
}

function extractStructuredValues(key: ProfileFacetKey, structured: unknown): FacetStructuredValues {
  if (!structured || typeof structured !== "object") return {};
  const obj = structured as { occupation?: unknown; interests?: unknown };
  if (key === "work_role") {
    return typeof obj.occupation === "string" ? { occupation: obj.occupation } : {};
  }
  if (key === "interests") {
    const list = coerceInterestList(obj.interests);
    if (list) return { interests: list.slice(0, MAX_RAW_INTERESTS) };
  }
  return {};
}

function coerceInterestList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.filter((i): i is string => typeof i === "string");
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((i): i is string => typeof i === "string");
    } catch {
      if (trimmed.endsWith("]")) return splitInterestFragments(trimmed.slice(1, -1));
    }
  }
  return splitInterestFragments(trimmed);
}

function splitInterestFragments(source: string): string[] {
  return source.split(",").map((fragment) => {
    let entry = fragment.trim();
    if (entry.startsWith("[")) entry = entry.slice(1);
    if (entry.endsWith("]")) entry = entry.slice(0, -1);
    entry = entry.trim();
    const quote = entry[0];
    if ((quote === '"' || quote === "'") && entry.endsWith(quote)) entry = entry.slice(1, -1);
    return entry;
  });
}

function normalizeOccupation(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const length = codePointLength(trimmed);
  if (length > NEARBY_MAX_OCCUPATION_CODEPOINTS) {
    getLogger().warn(
      "[memory/synthesizeProfile] occupation exceeded the publishable length; dropping it",
      { length, max: NEARBY_MAX_OCCUPATION_CODEPOINTS }
    );
    return undefined;
  }
  return trimmed;
}

function normalizeInterests(values: string[] | undefined): string[] | undefined {
  if (values === undefined) return undefined;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (codePointLength(trimmed) > NEARBY_MAX_INTEREST_CODEPOINTS) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
    if (out.length === NEARBY_MAX_INTERESTS) break;
  }
  return out.length > 0 ? out : undefined;
}
