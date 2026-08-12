/**
 * synthesizeProfile — client-side profile synthesis for People Nearby (C1).
 *
 * The vault is E2E-encrypted and device-authoritative; the server cannot read
 * it. So the shareable profile is synthesized ON-DEVICE here, in the SDK, from
 * the user's vault facts. The client then publishes the result (PII-redacted,
 * then server-side moderated in `nearby`) to the server-authoritative profile
 * store. The SDK stays STATELESS: no profile table, no persistence — the caller
 * owns storage and passes the prior doc back via `options.previous` for delta
 * refresh.
 *
 * Shape: the profile is decomposed into independent facets (bio, interests,
 * work/role, …). Each facet is one grounded `reflect()` pass over the vault, so
 * every section carries the `sourceMemoryIds` it was built from — enabling both
 * provenance and cheap delta refresh (only regenerate sections whose source
 * facts changed since the previous doc's `vaultWatermark`).
 *
 * Facet decomposition, per-facet synthesis, delta refresh, and the PII gate are
 * wired end-to-end. New facts are attributed to the facets they're relevant to
 * (by embedding similarity to each facet query) so an unrelated new fact doesn't
 * force a full re-synthesis — see {@link attributeFacts}.
 */

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

/** Open-weights default for on-device synthesis. Mirrors consolidate.ts:
 * ling-2.6-flash is preferred over gpt-oss for structured JSON (gpt-oss returns
 * empty content ~30% of the time and rejects response_format). */
const DEFAULT_SYNTHESIS_MODEL = "inclusionai/ling-2.6-flash";
/** How many vault facts to recall per facet before synthesis. */
const DEFAULT_FACET_RECALL_LIMIT = 20;
/** LLM output cap per section — sections are short prose. */
const DEFAULT_FACET_MAX_TOKENS = 512;
/** Scopes a shareable profile draws from. Defaults to the user's private vault;
 * the caller narrows/widens per its publishing policy. */
const DEFAULT_SCOPES = ["private"];
/** Cosine floor for attributing a brand-new fact to a facet. Mirrors recall's
 * DEFAULT_FACT_MIN_SCORE (0.1): a new fact is treated as relevant to a facet
 * only when its embedding clears the same floor against that facet's query that
 * recall would apply — i.e., recall for that facet would actually surface it.
 * A fact below the floor for every facet influences none (recall wouldn't
 * surface it anywhere), so it correctly triggers no regeneration. */
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

/**
 * Caps the consuming profile store enforces on the structured attributes
 * (`nearby` internal/profiles/service.go — `maxOccupationLen`, `maxInterests`,
 * `maxInterestLen`). An over-cap value is REJECTED outright, never truncated,
 * and one rejected attribute fails the whole profile upsert — so synthesis has
 * to land inside these itself or the values it emits are unpublishable.
 *
 * Counted in CODE POINTS, matching Go's `utf8.RuneCountInString`. Deliberately
 * not `String.prototype.length`, which counts UTF-16 units and scores every
 * astral-plane character (emoji, rarer CJK) double — that would drop values the
 * server would happily have taken.
 */
const NEARBY_MAX_OCCUPATION_CODEPOINTS = 80;
const NEARBY_MAX_INTERESTS = 12;
const NEARBY_MAX_INTEREST_CODEPOINTS = 40;

/**
 * Ceiling on how many raw interest entries survive extraction. Not the publish
 * cap — normalization drops blanks, over-long entries and duplicates AFTER
 * redaction, so the raw list needs slack or a couple of junk entries would
 * starve real ones out of the twelve.
 *
 * It does need SOME ceiling, because every surviving entry costs one NER
 * inference before the cap is ever applied (see {@link synthesizeFacet}), and
 * this field is unenforced model output: a response that ignores the array shape
 * can hand back hundreds of fragments — a comma-heavy string splits into one
 * entry per comma — turning one synthesis into hundreds of sequential
 * inferences. Twice the publish cap leaves the dedupe-then-cap behaviour intact
 * for anything resembling a real answer and bounds the work regardless.
 */
const MAX_RAW_INTERESTS = NEARBY_MAX_INTERESTS * 2;

/** Code-point (rune) length — see the cap constants above for why this can't be
 * `value.length`. */
function codePointLength(value: string): number {
  return [...value].length;
}

/** The prose contract every facet's synthesis shares. */
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

/** JSON schema coercing each facet's synthesis into a structured section. */
const FACET_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: FACET_BASE_PROPERTIES,
  required: ["summary", "hasEvidence"],
  additionalProperties: false,
};

/**
 * work_role and interests additionally emit a PUBLISH-READY structured value
 * beside the prose, because the consuming profile store has dedicated
 * `occupation` / `interests` columns and prose doesn't fit them. The `summary`
 * contract is untouched — the sections have their own consumers, and the
 * structured value is purely additive.
 *
 * The caps live in the field descriptions rather than as `maxLength` /
 * `maxItems` keywords on purpose. The default synthesis model isn't in
 * `supportsResponseFormat`'s `json_schema` allowlist, so `reflect` hands it this
 * schema as prompt text (reflect.ts) where a sentence reads at least as well as
 * a keyword; and a provider that *does* enforce json_schema can reject
 * validation keywords it doesn't implement, turning a 200 into a 400. Either
 * way the schema is a request, not a guarantee — the caps are actually enforced
 * by {@link normalizeOccupation} / {@link normalizeInterests} below.
 */
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

/** The response schema a facet is synthesized under: structured for the two
 * facets that back a profile column, the shared prose-only schema for the rest. */
function facetResponseSchema(key: ProfileFacetKey): Record<string, unknown> {
  if (key === "work_role") return WORK_ROLE_RESPONSE_SCHEMA;
  if (key === "interests") return INTERESTS_RESPONSE_SCHEMA;
  return FACET_RESPONSE_SCHEMA;
}

/** The extra structured field a column-backed facet emits, phrased for the
 * response line of the system prompt. Mirrors the schemas above — the model
 * sees both (reflect embeds the schema verbatim for models that can't take
 * `response_format`), and this plain line is the one it actually follows. */
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
  /** True when regeneration failed and a prior section value was carried
   * forward (e.g. LLM returned empty) — the caller may choose to retry. */
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
   * Pass the user's published set (e.g. `getAllVaultMemoriesOp(ctx, { visibility:
   * ["public"] })`) to keep a published profile derivable only from published
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
  // recall's semantic fact lane is gated on ctx.vaultCache too (recall.ts:
  // `types.includes("fact") && ctx.vaultCtx && ctx.vaultCache`). Without it the
  // only surviving fact source is the temporal lane, which returns nothing for
  // the non-temporal facet queries — so every section would come back empty and
  // publish a silently-empty profile. Fail loudly instead.
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

  // A prior doc is only reusable when its SHAPE (version) AND the config that
  // produced it match. A config change (added redactor, different scopes/facets)
  // must invalidate BOTH the fast path and per-section reuse — otherwise a
  // caller that newly adds PII redaction would get back the old un-gated text,
  // or a scope change would reuse the wrong evidence. This handles findings
  // #1 (PII fast-path leak) and #4 (version bump reusing old-shape sections).
  const previous =
    options.previous &&
    options.previous.version === PROFILE_DOC_VERSION &&
    configMatches(options.previous.config, config)
      ? options.previous
      : undefined;

  // Single fetch: the watermark and the changed-set are derived from the same
  // snapshot, both using changeTime() (which includes last_observed_at), so a
  // re-observation both advances the watermark AND lands in the changed-set.
  const memories = await getAllVaultMemoriesOp(ctx.vaultCtx, {
    // Scope the snapshot to the same scopes synthesis recalls from, so the
    // watermark, delta, and new-fact attribution all track only facts that can
    // actually appear in the profile — an out-of-scope change/new-fact must not
    // trigger a regeneration that scoped recall would never reflect.
    scopes,
    includeDeleted: true,
    includeSuperseded: true,
  });
  const watermark = computeVaultWatermark(memories);
  // C2 trends: live facts only (deleted/superseded don't belong in a
  // "what's trending" signal). Cheap + pure — recomputed even on the
  // delta fast path so a re-observation that didn't change watermark
  // equality still refreshes the badge counts when the caller re-runs.
  const observationTrends = summarizeObservationTrends(
    memories
      .filter((m) => !m.isDeleted && m.supersededBy === null)
      .map((m) => ({
        createdAt: m.createdAt,
        lastObservedAt: m.lastObservedAt,
        proofCount: m.proofCount,
      }))
  );

  // Fast path: reusable prior doc AND nothing in the vault changed since it AND
  // no sections are stale (which would block documented retry) AND every cited
  // fact is still present in the scoped snapshot.
  //
  // The watermark check is EQUALITY, not `>=`: the scoped max-changeTime is not
  // monotonic — when an uncited fact leaves scope (or is hard-deleted) the max
  // can DROP below previous.vaultWatermark. A `>=` test would read that decrease
  // as "unchanged" and freeze the doc, while delta kept comparing against the
  // inflated old mark (missing all later sub-mark edits). Requiring equality
  // treats any decrease as a change; computeStaleFacetKeys then full-regens and
  // the returned doc resets the watermark to the current (lower) value.
  const presentIds = new Set(memories.map((m) => m.uniqueId));
  const hasStaleSections = previous?.sections.some((s) => s.stale);
  const citesMissingFact = previous?.sections.some((s) =>
    s.sourceMemoryIds.some((id) => !presentIds.has(id))
  );
  if (previous && previous.vaultWatermark === watermark && !hasStaleSections && !citesMissingFact) {
    // Reuse all sections, but honor the current facet ORDER (ProfileDoc.sections
    // is facet-ordered, and facetsSignature intentionally ignores order so a
    // reorder reuses content). Preserve object identity when the order already
    // matches — a pure reorder is free (no regeneration), just an array reorder.
    // Always refresh C2 trend counts (cheap, reflects current evidence).
    const sameOrder =
      previous.sections.length === facets.length &&
      facets.every((f, i) => previous.sections[i]?.key === f.key);
    if (sameOrder) {
      // Preserve object identity when trend counts are unchanged — callers
      // (and tests) treat wholesale reuse as referential equality.
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

  const settled = await Promise.allSettled(
    facets.map(async (facet) => {
      const prior = previous?.sections.find((s) => s.key === facet.key);
      if (prior && !staleKeys.has(facet.key)) {
        return prior; // reuse verbatim — its source facts are unchanged
      }
      return synthesizeFacet(facet, ctx, options, prior);
    })
  );

  // One rejected facet must not fail the whole profile: fall back to the prior
  // section (marked stale) or an empty one. Finding #3.
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
    return fallbackSection(
      facet,
      previous?.sections.find((s) => s.key === facet.key)
    );
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

/** Whether two config fingerprints are equivalent for reuse purposes. A prior
 * doc with no `config` (never possible for docs this version produces) is
 * treated as non-matching. */
function configMatches(
  a: ProfileConfigFingerprint | undefined,
  b: ProfileConfigFingerprint
): boolean {
  if (!a) return false;
  // facetsSignature subsumes the facet key set AND each facet's prompt content,
  // so a prompt-only change (same keys) still invalidates reuse.
  // reviewedMemoryIdsSignature: missing on docs that predate the field ≡ ""
  // (ungated), so an ungated re-run still reuses; a newly-supplied review set
  // invalidates.
  return (
    a.redacted === b.redacted &&
    a.facetsSignature === b.facetsSignature &&
    (a.reviewedMemoryIdsSignature ?? "") === b.reviewedMemoryIdsSignature &&
    a.scopes.length === b.scopes.length &&
    a.scopes.every((s, i) => s === b.scopes[i])
  );
}

/** Order-independent digest of the publish-review id set. Empty / omitted → "". */
function reviewedMemoryIdsSignature(ids: readonly string[] | undefined): string {
  // `undefined` (no gate) and `[]` (gate active, nothing approved) are DIFFERENT configs and must
  // produce different signatures: collapsing both to "" would let a doc synthesized ungated be
  // reused verbatim once the caller starts passing an empty published set, silently serving
  // private-derived content the gate now forbids. The sentinel can't collide with a real id list
  // because ids never contain NUL.
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
 * Not exported through the barrels; `synthesizeProfile.test.ts` consumes it so
 * the test builds prior-doc fingerprints from the real algorithm rather than a
 * mirror of it — the schemas it folds in are module-private and a hand-copied
 * mirror would rot into "everything regenerates" test noise.
 */
export function facetsSignature(facets: ProfileFacet[]): string {
  // JSON-encode each facet's fields so no field boundary can collide, sort so
  // display order doesn't matter (sections are rebuilt in facet order), join.
  // The schema stringifies deterministically — it's a module constant, so its
  // key order only moves when this file does, which is exactly when the
  // signature should move.
  return facets
    .map((f) => JSON.stringify([f.key, f.label, f.query, f.guidance, facetResponseSchema(f.key)]))
    .sort()
    .join("\n");
}

/** Whether two C2 trend-count maps are equal. Missing prior → not equal
 * (forces a refresh onto docs that predate the field). */
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

/** A memory's effective change-time — the newest of last edit, supersession,
 * and C3 re-observation. Used for BOTH the watermark and the changed-set so a
 * re-observation (which preserves updated_at) still counts as a change. */
function changeTime(m: StoredVaultMemory): number {
  return Math.max(m.updatedAt.getTime(), m.supersededAt ?? 0, m.lastObservedAt ?? 0);
}

/** Max change-time across ALL vault facts (incl. deleted + superseded, so a
 * deletion/supersession advances the watermark). */
function computeVaultWatermark(memories: StoredVaultMemory[]): number {
  let max = 0;
  for (const m of memories) {
    const t = changeTime(m);
    if (t > max) max = t;
  }
  return max;
}

/**
 * Which facets must be regenerated. Rules:
 * - No (usable) previous doc → all facets are stale (first synthesis / config
 *   or version change).
 * - Existing-fact changes (edit / re-observe / supersede / delete) → the facets
 *   whose prior section cited a changed id. Uses changeTime() so a re-observation
 *   reaches its citing section (#2).
 * - Sections left stale by a prior failed regeneration → retried.
 * - Newly-requested facets (no prior section) → stale.
 * - Changed facts that no current section cites (brand-new, newly-in-scope, or
 *   a supersession successor) → attributed to the facets they're relevant to
 *   (see {@link attributeFacts}) rather than forcing a full re-synthesis,
 *   falling back to ALL facets only when attribution can't be computed safely.
 *   With the review gate armed, only REVIEWED candidates are attributed — see
 *   the note at the attribution step.
 * - Watermark DECREASE (current scoped max < previous) → the baseline is no
 *   longer reliable (a high-changeTime fact left scope / was removed), so
 *   per-fact delta against the inflated prior mark would miss real changes →
 *   regenerate ALL facets. The returned doc stores the current (lower) mark,
 *   restoring an accurate baseline.
 * NB: no early-return on an empty `changed` set — stale-retry and new-facet
 * checks must still run when the vault itself is unchanged.
 */
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
  // Ids visible in the scoped snapshot (soft-deleted/superseded rows are present
  // via includeDeleted/includeSuperseded). A cited id ABSENT here left the
  // synthesis scopes or was hard-deleted — recall would no longer surface it, so
  // its citing section must refresh even though it never appears in `changed`.
  const presentIds = new Set(memories.map((m) => m.uniqueId));
  const stale = new Set<ProfileFacetKey>();

  for (const section of previous.sections) {
    if (section.sourceMemoryIds.some((id) => changedIds.has(id))) {
      stale.add(section.key);
    }
    // A cited fact that vanished from the scoped snapshot (scope exit / hard
    // delete) means the section's evidence changed — refresh it.
    if (section.sourceMemoryIds.some((id) => !presentIds.has(id))) {
      stale.add(section.key);
    }
    // Sections marked stale from a prior failed regeneration must be retried.
    if (section.stale) {
      stale.add(section.key);
    }
  }
  // Any facet without a prior section (newly-requested facet) is also stale.
  for (const facet of facets) {
    if (!previous.sections.some((s) => s.key === facet.key)) stale.add(facet.key);
  }

  // Changed, live facts that no current section cites are "new evidence" to the
  // profile — whether brand-new (new createdAt), newly moved into scope (scope
  // edit bumps updated_at but keeps an old createdAt), or a fresh supersession
  // successor. Attribute them to relevant facets instead of regenerating
  // everything. Cited changed facts already marked their section stale above.
  const citedIds = new Set(previous.sections.flatMap((s) => s.sourceMemoryIds));
  let toAttribute = changed.filter(
    (m) => !m.isDeleted && !m.supersededBy && !citedIds.has(m.uniqueId)
  );
  // The watermark and the changed-set deliberately track the WHOLE scoped vault,
  // but the review gate intersects each facet's evidence with `reviewedMemoryIds`
  // before anything reaches the LLM. So an UNREVIEWED changed fact is not new
  // evidence for any section — attributing it bills a re-synthesis whose gated
  // input is byte-identical to the one that produced the prior section. That is
  // the common case, not an edge: chat auto-extract writes unreviewed facts on
  // every turn, so without this filter each refresh after any conversation
  // regenerated whatever facets the fresh fact attributed to — or ALL of them,
  // since a just-extracted fact often has no embedding yet and attributeFacts
  // bails to a full regenerate. Delta refresh was only cheap on a dormant vault.
  //
  // Only the attribution step needs the filter. A section can only cite ids that
  // survived the gate, so the cited-changed path above is already reviewed-only;
  // and any change to the reviewed set moves `reviewedMemoryIdsSignature`, which
  // discards `previous` outright.
  //
  // Bound worth knowing: the gated recall asks for RECALL_MAX_LIMIT and slices
  // to it *before* the intersection (see synthesizeFacet — the cap is the limit
  // passed at that call site, not something recall applies on its own), so on a
  // vault deep enough to fill that window an unreviewed fact can displace a
  // reviewed one out of it and quietly change a section's evidence. That section
  // then carries one-refresh-stale text until its own evidence moves — a far
  // better trade than billing every facet on every turn.
  if (reviewedMemoryIds !== undefined) {
    const allowed = new Set(reviewedMemoryIds);
    toAttribute = toAttribute.filter((m) => allowed.has(m.uniqueId));
  }
  if (toAttribute.length > 0) {
    const attributed = await attributeFacts(ctx, toAttribute, facets);
    if (attributed === null) return allKeys; // can't attribute safely → regen all
    for (const k of attributed) stale.add(k);
  }

  return stale;
}

/**
 * Attribute each candidate fact to the facets it's relevant to, comparing the
 * fact's stored embedding against each facet query's embedding — the SEMANTIC
 * (vector) signal. This is a lower bound on what recall would surface: recall's
 * fact lane also fuses BM25, entity-graph, and temporal lanes, so a fact can be
 * surfaced for a facet without clearing the cosine floor. Attribution therefore
 * only *narrows* regeneration when it is SOUND to do so:
 * - Candidate matches ≥1 facet by cosine → attribute to those facets.
 * - Candidate matches NO facet by cosine → we cannot conclude it's irrelevant
 *   (a non-vector lane may still surface it) → return `null` (regenerate all).
 * Returns `null` (→ "regenerate all facets") whenever attribution can't be
 * computed soundly: a candidate matching no facet semantically, a fact lacking
 * a usable embedding or embedded under a different model (cosine meaningless),
 * or a thrown embedding request (a transient failure must not abort synthesis
 * when the documented fallback is a full regenerate). Each such bail is logged.
 */
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

  // Embed the facet queries with the same options recall uses (cached across
  // calls via EmbeddingOptions.cache — cheaper than the reflect() passes saved).
  // A thrown embedding request degrades to "regenerate all", never a hard fail.
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
    // No semantic match — but recall's non-vector lanes (BM25/entity/temporal)
    // could still surface this fact for some facet, so we cannot soundly drop
    // it. Fall back to a full regenerate rather than risk a missed section.
    if (!matchedAny) return null;
  }
  return keys;
}

/** One grounded synthesis pass for a single facet. Gates its own fresh text
 * through the PII redactor when supplied, so the returned section is
 * publish-safe. On a DEGRADED-empty result (LLM failure, empty text despite
 * evidence) it falls back to the prior section (marked stale) rather than
 * wiping a previously-good section (#3). A legitimate "no evidence" verdict
 * (hasEvidence=false) clears the section as intended.
 *
 * Evidence path: recall with profile-worthiness knobs → optional
 * `reviewedMemoryIds` intersection → reflect with `memories` override so the
 * LLM never sees unreviewed facts.
 */
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
  // The gate is ACTIVE whenever the caller supplied the field at all — an empty array means
  // "nothing is approved for publication", which must produce nothing.
  //
  // This deliberately reverses the previous `length > 0` condition, under which an empty array
  // disabled the gate entirely. That failed OPEN in exactly the case the gate exists for: a caller
  // passing its published-memory set for a user who has published nothing handed over an empty
  // array and got synthesis across the whole private vault — and via anuma-ai/sdk#816 those private
  // facts become public `occupation`/`interests` matching keys. People Nearby's two-tier model
  // (private = never leaves the device) makes "omitted" the only way to ask for no gate.
  const hasReviewGate = reviewed !== undefined;
  if (hasReviewGate && reviewed.length === 0) {
    // Nothing approved: return the legitimate-empty section without recalling or calling the LLM.
    // Same shape as an empty intersection below (NOT a stale fallback — there is no failure here),
    // and it skips all spend for what is the common state before a user publishes anything.
    return {
      key: facet.key,
      label: facet.label,
      text: "",
      sourceMemoryIds: [],
      generatedAt: Date.now(),
    };
  }

  // When gating, fetch up to RECALL_MAX_LIMIT before intersecting — `undefined`
  // is NOT unbounded (`recall` defaults to 8), which would shrink the pool
  // below the ungated facet limit and drop approved evidence ranked 9+.
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

  // Reviewed gate (or empty recall) with no surviving evidence — clear the
  // section as legitimate empty, not a stale LLM failure.
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
    // Profile-facet synthesis is a background op, so it marks its own prompt AND
    // names its own task. reflect() itself must do neither — it also serves the
    // user's own questions, and that traffic is chat, not an internal flow. See
    // ../internalFlowMarker and ReflectOptions.taskType.
    taskType: "memory_profile_synth",
    systemPrompt: withInternalFlowMarker(FACET_SYSTEM_PROMPT),
    // The facet's label/guidance/response-fields, on the user turn — what keeps
    // the system half fixed and therefore server-ownable.
    userInstructions: buildFacetUserInstructions(facet),
    responseSchema: facetResponseSchema(facet.key),
    memories,
  });

  // Empty memoryIds means recall found no evidence — treat as legitimate empty
  // to properly clear sections whose cited facts were deleted/superseded.
  const noEvidence = result.basedOn.memoryIds.length === 0;
  const { text, legitimateEmpty } = extractFacetText(result.structuredOutput);

  if (!text && !legitimateEmpty && !noEvidence) {
    // Degraded empty (LLM produced nothing but not an explicit no-evidence
    // verdict, and recall did return evidence) — keep the prior section, stale.
    getLogger().warn(
      "[memory/synthesizeProfile] facet synthesis returned degraded-empty; keeping prior section",
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

  // Structured attributes ride ALONGSIDE the prose for the two facets that back
  // a profile column. Skipped on a no-evidence verdict (and on an empty cited
  // set), so a section that clears its prose clears its attributes too rather
  // than publishing values nothing grounds.
  if (!legitimateEmpty && !noEvidence) {
    const values = extractStructuredValues(facet.key, result.structuredOutput);
    // Redact BEFORE enforcing the caps. These are published strings, so
    // `config.redacted` has to hold for them as much as for the prose; and a
    // placeholder changes both a value's length and whether two entries are
    // duplicates, so trimming, capping and deduping have to run on the text
    // that actually ships. Sequentially, so placeholder numbering within a
    // section is deterministic.
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

/** Fallback when a facet's synthesis failed (rejected or degraded-empty): keep
 * the prior section (marked stale) so a previously-good section survives; only
 * emit an empty section when there was no prior. */
function fallbackSection(facet: ProfileFacet, prior: ProfileSection | undefined): ProfileSection {
  // fallbackSection is only reached on a FAILURE (rejected or degraded-empty),
  // never on a legitimate no-evidence verdict — so always mark the result stale
  // so computeStaleFacetKeys retries it next call, even when there's no prior
  // text to preserve. (A genuine no-evidence result clears the section via the
  // non-fallback path and is not marked stale.)
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

/**
 * Grounding system prompt for facet synthesis — FIXED and facet-agnostic, and it
 * has to stay that way.
 *
 * It used to open with the facet's label and carry its guidance and its
 * structured-response hint inline, which made the system message a different
 * string per facet. All three now ride the USER turn (see
 * {@link buildFacetUserInstructions}), so what is left is one constant the portal
 * can own: it is registered verbatim as `memory_profile_synth` in ai-portal
 * `internal/systemprompt/tasks.go` and matched there by `strings.Contains`
 * against the system message we send. The message is this text plus a prefix
 * ({@link withInternalFlowMarker}) and, for models that cannot take
 * `response_format`, a JSON-Schema tail that reflect() appends — a substring
 * match holds through both. Interpolating a facet value back in would not.
 *
 * The rules are unchanged from the per-facet version except the response line,
 * which now points at the shape the user turn gives rather than spelling one out.
 */
const FACET_SYSTEM_PROMPT = `You are writing one section of a person's shareable profile, using their private memories (supplied as evidence) as the only source of truth. The user turn names the section, states the task for it, and gives the exact JSON shape to respond in.

Rules:
- Ground every claim in the supplied memories — never invent, infer beyond, or embellish what they support.
- If the memories don't cover this section, return an empty summary with hasEvidence=false. Do not pad or guess.
- Write in third person about the person, in a natural voice suitable for a public profile (no "I"/"you", no name repetition).
- Be concise and specific; no preamble, hedging, or meta-commentary.
- Respond as JSON in exactly the shape the user turn states, with no extra fields.`;

/** The facet-specific half of the synthesis prompt: which section this is, what
 * to write for it, and which JSON fields to emit. Rides the USER turn (reflect's
 * `userInstructions`, placed between the question and the evidence block) so
 * {@link FACET_SYSTEM_PROMPT} can stay fixed. Same three values the system
 * prompt used to interpolate — label, guidance, structured-response hint. */
function buildFacetUserInstructions(facet: ProfileFacet): string {
  const structuredField = FACET_STRUCTURED_RESPONSE_HINT[facet.key] ?? "";
  return `Section: "${facet.label}"

Task for this section:
${facet.guidance}

Respond as JSON: { "summary": <the section text, or "">, "hasEvidence": <true|false>${structuredField} }.`;
}

/** Pull section text from the structured output only. Returns `legitimateEmpty`
 * when the LLM explicitly reported no evidence (hasEvidence=false) — the caller
 * clears the section in that case; any OTHER empty result (missing/partial JSON)
 * is a degradation, so the caller keeps the prior section. */
function extractFacetText(structured: unknown): { text: string; legitimateEmpty: boolean } {
  if (structured && typeof structured === "object") {
    const obj = structured as { summary?: unknown; hasEvidence?: unknown };
    if (obj.hasEvidence === false) return { text: "", legitimateEmpty: true };
    if (typeof obj.summary === "string")
      return { text: obj.summary.trim(), legitimateEmpty: false };
  }
  // No valid structured summary — missing, partial, or unparseable JSON. This is
  // a DEGRADED result, not a legitimate empty: never fall back to reflect's raw
  // text, which (since we always request structured output) is the JSON payload
  // itself and would publish a truncated `{"summary": ...` fragment as prose.
  return { text: "", legitimateEmpty: false };
}

/** A facet's structured attributes. Only the owning facet ever fills its field. */
interface FacetStructuredValues {
  occupation?: string;
  interests?: string[];
}

/**
 * Pull a facet's structured attributes off the LLM's JSON — shape-checked and
 * count-bounded, but NOT yet trimmed, length-capped, or deduped (that runs after
 * redaction; see {@link synthesizeFacet}).
 *
 * Deliberately tolerant. The default synthesis model receives the schema as a
 * prompt instruction rather than an enforced `response_format`, so a missing or
 * mis-shaped field is expected traffic, not an error: anything unusable is
 * dropped and the prose section still publishes. A facet never fails because
 * its structured attribute didn't come back.
 */
function extractStructuredValues(key: ProfileFacetKey, structured: unknown): FacetStructuredValues {
  if (!structured || typeof structured !== "object") return {};
  const obj = structured as { occupation?: unknown; interests?: unknown };
  if (key === "work_role") {
    return typeof obj.occupation === "string" ? { occupation: obj.occupation } : {};
  }
  if (key === "interests") {
    const list = coerceInterestList(obj.interests);
    // Bounded here rather than in normalizeInterests: the entries between the
    // two are redacted one by one, so the ceiling has to land before that loop
    // to actually bound anything.
    if (list) return { interests: list.slice(0, MAX_RAW_INTERESTS) };
  }
  return {};
}

/**
 * Coerce whatever landed in the `interests` slot into a list of strings, or
 * undefined when it isn't recoverable. Non-string members are dropped rather
 * than stringified — a number or object in there means the response was
 * improvised, and improvised values aren't publishable.
 */
function coerceInterestList(value: unknown): string[] | undefined {
  if (Array.isArray(value)) return value.filter((i): i is string => typeof i === "string");
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  // A model that ignored the array shape either serializes the array into the
  // slot or reaches for the comma-separated list the `summary` guidance asks
  // for. Parse the first case: splitting `["trail running","film photography"]`
  // on commas yields `["trail running` and `"film photography"]`, which are
  // non-blank and inside the length cap, so the brackets and quotes would
  // survive every downstream check and land verbatim in a published column.
  if (trimmed.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.filter((i): i is string => typeof i === "string");
    } catch {
      // Bracketed but not valid JSON (unquoted entries, or a stray trailing
      // comma). Shed the brackets so the comma split below doesn't carry them
      // into the column.
      if (trimmed.endsWith("]")) return splitInterestFragments(trimmed.slice(1, -1));
    }
  }
  // An interest containing a comma would split, but they're short noun phrases
  // and this path is only reached on already-malformed output.
  return splitInterestFragments(trimmed);
}

/**
 * Comma-split a non-JSON interests string, shedding the serialization
 * punctuation the split leaves stuck to each fragment. Shedding the outer
 * brackets isn't enough on its own: `["trail running", "film photography",]`
 * doesn't parse (trailing comma) yet still splits into `"trail running"` WITH
 * its quotes, and a response truncated mid-array keeps its opening bracket on
 * the first fragment. Both are non-blank and well inside the length cap, so they
 * clear every downstream check and reach a published column verbatim.
 *
 * Only a MATCHED pair of wrapping quotes comes off, and at most one bracket per
 * side. A greedy strip would eat the leading apostrophe off a real entry like
 * `'90s music`, which is a worse trade than leaving one unbalanced quote on
 * output that was already malformed twice over.
 */
function splitInterestFragments(source: string): string[] {
  return source.split(",").map((fragment) => {
    let entry = fragment.trim();
    if (entry.startsWith("[")) entry = entry.slice(1);
    if (entry.endsWith("]")) entry = entry.slice(0, -1);
    entry = entry.trim();
    const quote = entry[0];
    // A lone quote character collapses to empty here, which normalization then
    // drops — the right outcome for a fragment that was pure punctuation.
    if ((quote === '"' || quote === "'") && entry.endsWith(quote)) entry = entry.slice(1, -1);
    return entry;
  });
}

/**
 * Trim an occupation and check it against the publish cap. An over-cap value is
 * DROPPED, not truncated: the server rejects the whole upsert on an overrun, and
 * a phrase clipped mid-word misrepresents someone in a field that reads as a
 * fact. The prose section still carries the full statement, so the trade is
 * coverage (the column stays empty when the model ignores the length guidance)
 * for never publishing a garbled derivative.
 */
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

/**
 * Reduce an interests list to something the profile store takes verbatim.
 *
 * Mirrors nearby's `normalizeInterests` (the column is a SET — interests are
 * matching keys, so an unnormalized list distorts overlap scores): entries are
 * trimmed, and repeats differing only by case or surrounding space collapse
 * with the FIRST spelling winning. On top of that this enforces the caps the
 * server validates BEFORE it normalizes — over-long entries are dropped
 * individually so the rest of the list still publishes, and the item cap is
 * applied after deduping so duplicates don't eat slots. Undefined when nothing
 * survives, so the field is omitted rather than published empty.
 */
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
