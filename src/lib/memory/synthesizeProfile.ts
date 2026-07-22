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
import { DEFAULT_API_EMBEDDING_MODEL } from "../memoryEngine/constants.js";
import { generateEmbeddings } from "../memoryEngine/embeddings.js";
import { cosineSimilarity } from "../memoryEngine/vector.js";
import type { PiiRedactor } from "../pii/redactor.js";
import type { PortalLlmAuth } from "./portalLlm.js";
import { reflect } from "./reflect.js";
import type { RecallContext } from "./types.js";

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

/** JSON schema coercing each facet's synthesis into a structured section. */
const FACET_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "The synthesized section prose. Empty string if the memories don't cover it.",
    },
    hasEvidence: {
      type: "boolean",
      description: "False when the supplied memories don't support any claim for this facet.",
    },
  },
  required: ["summary", "hasEvidence"],
  additionalProperties: false,
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
  /** Unix ms this section was generated. */
  generatedAt: number;
  /** True when regeneration failed and a prior section value was carried
   * forward (e.g. LLM returned empty) — the caller may choose to retry. */
  stale?: boolean;
}

/** Fingerprint of the config that produced a {@link ProfileDoc}. Delta reuse
 * (both the wholesale fast path and per-section reuse) is only valid when the
 * current call's config matches — otherwise reused sections could carry the
 * wrong scope's evidence, un-redacted text under a now-present redactor, or an
 * old section shape. */
export interface ProfileConfigFingerprint {
  /** Facet keys present in the doc, sorted. */
  facetKeys: ProfileFacetKey[];
  /** Order-independent digest of each facet's full definition (key + label +
   * query + guidance). Reuse must invalidate when a facet's PROMPT changes, not
   * just its key set — otherwise reused sections carry text generated under the
   * old definition. Facet display order does NOT invalidate (sections are
   * rebuilt in facet order and reused by key). */
  facetsSignature: string;
  /** Scopes the facts were drawn from, sorted. */
  scopes: string[];
  /** Whether a PII redactor gated the section text. Reusing un-gated text under
   * a now-present redactor would leak PII, so this flips the fingerprint. */
  redacted: boolean;
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
  const facets = options.facets ?? DEFAULT_PROFILE_FACETS;
  const scopes = options.scopes ?? DEFAULT_SCOPES;
  const config: ProfileConfigFingerprint = {
    facetKeys: facets.map((f) => f.key).sort(),
    facetsSignature: facetsSignature(facets),
    scopes: [...scopes].sort(),
    redacted: options.redactor !== undefined,
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
    return previous;
  }

  const staleKeys = await computeStaleFacetKeys(ctx, memories, facets, previous, watermark);

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
  return (
    a.redacted === b.redacted &&
    a.facetsSignature === b.facetsSignature &&
    a.scopes.length === b.scopes.length &&
    a.scopes.every((s, i) => s === b.scopes[i])
  );
}

/** Order-independent digest of the facet definitions — key + label + query +
 * guidance. Sorted so facet reordering (handled by the facet-order map) doesn't
 * invalidate reuse, but any prompt/label change does. */
function facetsSignature(facets: ProfileFacet[]): string {
  // JSON-encode each facet's fields so no field boundary can collide, sort so
  // display order doesn't matter (sections are rebuilt in facet order), join.
  return facets
    .map((f) => JSON.stringify([f.key, f.label, f.query, f.guidance]))
    .sort()
    .join("\n");
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
  watermark: number
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
  const toAttribute = changed.filter(
    (m) => !m.isDeleted && !m.supersededBy && !citedIds.has(m.uniqueId)
  );
  if (toAttribute.length > 0) {
    const attributed = await attributeFacts(ctx, toAttribute, facets);
    if (attributed === null) return allKeys; // can't attribute safely → regen all
    for (const k of attributed) stale.add(k);
  }

  return stale;
}

/**
 * Attribute each candidate fact to the facets it's relevant to, by comparing
 * the fact's stored embedding against each facet query's embedding — the same
 * vector comparison recall's fact lane uses. A fact is attributed to a facet
 * when their cosine clears {@link NEW_FACT_ATTRIBUTION_MIN_SCORE}. A fact below
 * the floor for every facet influences none (recall wouldn't surface it
 * anywhere either). Returns `null` — signalling "regenerate all facets" — when
 * attribution can't be computed safely: a fact lacking a usable embedding or
 * embedded under a different model (cosine would be meaningless), or a thrown
 * embedding request (transient failure must not abort the whole synthesis when
 * the documented unsafe-attribution fallback is a full regenerate).
 */
async function attributeFacts(
  ctx: RecallContext,
  candidates: StoredVaultMemory[],
  facets: ProfileFacet[]
): Promise<Set<ProfileFacetKey> | null> {
  const model = ctx.embeddingOptions.model ?? DEFAULT_API_EMBEDDING_MODEL;
  const factVectors: number[][] = [];
  for (const f of candidates) {
    if (!f.embedding) return null;
    if (f.embeddingModel && f.embeddingModel !== model) return null;
    let vec: unknown;
    try {
      vec = JSON.parse(f.embedding);
    } catch {
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
  } catch {
    return null;
  }

  const keys = new Set<ProfileFacetKey>();
  for (const fv of factVectors) {
    for (let i = 0; i < facets.length; i++) {
      if (cosineSimilarity(fv, queryVectors[i]) >= NEW_FACT_ATTRIBUTION_MIN_SCORE) {
        keys.add(facets[i].key);
      }
    }
  }
  return keys;
}

/** One grounded synthesis pass for a single facet. Gates its own fresh text
 * through the PII redactor when supplied, so the returned section is
 * publish-safe. On a DEGRADED-empty result (LLM failure, empty text despite
 * evidence) it falls back to the prior section (marked stale) rather than
 * wiping a previously-good section (#3). A legitimate "no evidence" verdict
 * (hasEvidence=false) clears the section as intended. */
async function synthesizeFacet(
  facet: ProfileFacet,
  ctx: RecallContext,
  options: SynthesizeProfileOptions,
  prior: ProfileSection | undefined
): Promise<ProfileSection> {
  const result = await reflect(facet.query, ctx, {
    apiKey: options.apiKey,
    getToken: options.getToken,
    llmModel: options.llmModel ?? DEFAULT_SYNTHESIS_MODEL,
    baseUrl: options.baseUrl,
    fetchFn: options.fetchFn,
    scopes: options.scopes ?? DEFAULT_SCOPES,
    limit: options.limit ?? DEFAULT_FACET_RECALL_LIMIT,
    types: ["fact"],
    maxTokens: DEFAULT_FACET_MAX_TOKENS,
    systemPrompt: buildFacetSystemPrompt(facet),
    responseSchema: FACET_RESPONSE_SCHEMA,
  });

  // Empty memoryIds means recall found no evidence — treat as legitimate empty
  // to properly clear sections whose cited facts were deleted/superseded.
  const noEvidence = result.basedOn.memoryIds.length === 0;
  const { text, legitimateEmpty } = extractFacetText(result.structuredOutput);

  if (!text && !legitimateEmpty && !noEvidence) {
    // Degraded empty (LLM produced nothing but not an explicit no-evidence
    // verdict) — keep the prior section, marked stale.
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

/** Grounding system prompt for a facet — reuses reflect's evidence discipline
 * and layers the facet-specific guidance + structured-output contract. */
function buildFacetSystemPrompt(facet: ProfileFacet): string {
  return `You are writing the "${facet.label}" section of a person's shareable profile, using their private memories (supplied as evidence) as the only source of truth.

Task for this section:
${facet.guidance}

Rules:
- Ground every claim in the supplied memories — never invent, infer beyond, or embellish what they support.
- If the memories don't cover this section, return an empty summary with hasEvidence=false. Do not pad or guess.
- Write in third person about the person, in a natural voice suitable for a public profile (no "I"/"you", no name repetition).
- Be concise and specific; no preamble, hedging, or meta-commentary.
- Respond as JSON: { "summary": <the section text, or "">, "hasEvidence": <true|false> }.`;
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
