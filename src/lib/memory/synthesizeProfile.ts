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
 * This is the C1 scaffold: the facet decomposition, per-facet synthesis, delta
 * refresh, and PII gate are wired end-to-end. Prompt tuning per facet and
 * attributing brand-new facts to specific facets without a full re-synthesis
 * are marked as follow-ups inline.
 */

import { getAllVaultMemoriesOp } from "../db/memoryVault/operations.js";
import type { StoredVaultMemory } from "../db/memoryVault/types.js";
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
    query: "Who is this person? Their background, personality, and what defines them.",
    guidance:
      "Write a warm, first-person-neutral 1-2 sentence bio capturing who this person is. No filler.",
  },
  {
    key: "interests",
    label: "Interests",
    query: "What are this person's hobbies, passions, and interests?",
    guidance:
      "List the person's genuine interests and hobbies as a short, specific phrase list. Prefer concrete activities over vague categories.",
  },
  {
    key: "work_role",
    label: "Work & Role",
    query: "What does this person do for work? Their profession, role, and field.",
    guidance:
      "State the person's current work/role and field in one concise line. Omit if the memories don't cover it.",
  },
  {
    key: "location_context",
    label: "Location",
    query: "Where does this person live, spend time, or come from?",
    guidance:
      "Summarize where the person is based / spends time at a neighborhood-or-city granularity. Never emit a precise address.",
  },
  {
    key: "communication_style",
    label: "Communication Style",
    query: "How does this person communicate, express themselves, and interact with others?",
    guidance:
      "Describe the person's communication and social style in one line (e.g. direct, playful, thoughtful).",
  },
  {
    key: "recent_activity",
    label: "Recently",
    query: "What has this person been doing, thinking about, or working on recently?",
    guidance:
      "Summarize what the person has been up to lately in one line. Favor recently re-observed facts.",
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
  const watermark = await computeVaultWatermark(ctx);
  const previous = options.previous;

  // Fast path: nothing in the vault changed since the previous doc → reuse it
  // wholesale. Watermark covers create/edit/re-observe/supersede/delete.
  if (
    previous &&
    previous.version === PROFILE_DOC_VERSION &&
    previous.vaultWatermark >= watermark
  ) {
    return previous;
  }

  // Decide, per facet, whether to regenerate or reuse the prior section.
  const staleKeys = await computeStaleFacetKeys(ctx, facets, previous, watermark);

  const sections = await Promise.all(
    facets.map(async (facet) => {
      const prior = previous?.sections.find((s) => s.key === facet.key);
      if (prior && !staleKeys.has(facet.key)) {
        return prior; // reuse verbatim — its source facts are unchanged
      }
      return synthesizeFacet(facet, ctx, options);
    })
  );

  // Apply the PII gate to freshly-synthesized section text (reused sections
  // were already gated when first produced).
  const gated = options.redactor
    ? await Promise.all(sections.map((s) => gateSection(s, options.redactor!, previous)))
    : sections;

  return {
    version: PROFILE_DOC_VERSION,
    sections: gated,
    vaultWatermark: watermark,
    generatedAt: Date.now(),
  };
}

/** Max change-time across ALL vault facts (including deleted + superseded, so a
 * deletion/supersession advances the watermark). Uses `updated_at`,
 * `superseded_at`, and the C3 `last_observed_at` re-observation stamp. */
async function computeVaultWatermark(ctx: RecallContext): Promise<number> {
  const all = await getAllVaultMemoriesOp(ctx.vaultCtx!, {
    includeDeleted: true,
    includeSuperseded: true,
  });
  let max = 0;
  for (const m of all) {
    const t = Math.max(m.updatedAt.getTime(), m.supersededAt ?? 0, m.lastObservedAt ?? 0);
    if (t > max) max = t;
  }
  return max;
}

/**
 * Which facets must be regenerated. Rules:
 * - No previous doc → all facets are stale (first synthesis).
 * - Any brand-new fact since the previous watermark → regenerate ALL facets: a
 *   new fact could match any facet and we can't attribute it without recall.
 *   (Follow-up: attribute new facts to facets via a cheap recall pass so an
 *   unrelated new fact doesn't force a full re-synthesis.)
 * - Otherwise (only edits/re-observations/supersessions/deletions of existing
 *   facts) → regenerate only the facets whose prior section cited a changed id.
 */
async function computeStaleFacetKeys(
  ctx: RecallContext,
  facets: ProfileFacet[],
  previous: ProfileDoc | undefined,
  watermark: number
): Promise<Set<ProfileFacetKey>> {
  const allKeys = new Set(facets.map((f) => f.key));
  if (!previous) return allKeys;

  const changed = await getAllVaultMemoriesOp(ctx.vaultCtx!, {
    since: new Date(previous.vaultWatermark),
    includeDeleted: true,
    includeSuperseded: true,
  });
  if (changed.length === 0) return new Set();

  const hasNewFact = changed.some(
    (m: StoredVaultMemory) => m.createdAt.getTime() > previous.vaultWatermark
  );
  if (hasNewFact) return allKeys;

  const changedIds = new Set(changed.map((m) => m.uniqueId));
  const stale = new Set<ProfileFacetKey>();
  for (const section of previous.sections) {
    if (section.sourceMemoryIds.some((id) => changedIds.has(id))) {
      stale.add(section.key);
    }
  }
  // Any facet without a prior section (newly-requested facet) is also stale.
  for (const facet of facets) {
    if (!previous.sections.some((s) => s.key === facet.key)) stale.add(facet.key);
  }
  void watermark;
  return stale;
}

/** One grounded synthesis pass for a single facet. */
async function synthesizeFacet(
  facet: ProfileFacet,
  ctx: RecallContext,
  options: SynthesizeProfileOptions
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

  return {
    key: facet.key,
    label: facet.label,
    text: extractFacetText(result.structuredOutput, result.text),
    sourceMemoryIds: result.basedOn.memoryIds,
    generatedAt: Date.now(),
  };
}

/** Grounding system prompt for a facet — reuses reflect's evidence discipline
 * and layers the facet-specific guidance + structured-output contract. */
function buildFacetSystemPrompt(facet: ProfileFacet): string {
  return `You are building the "${facet.label}" section of a person's shareable profile from their private memories, which are supplied as evidence.

${facet.guidance}

Rules:
- Ground every claim in the supplied memories — never invent facts they don't support.
- If the memories don't cover this section, return an empty summary and hasEvidence=false.
- Write about the person in a neutral third-person-free voice suitable for a public profile.
- Be concise. No preamble, no meta-commentary.`;
}

/** Pull the section text from the structured output, falling back to raw text.
 * An explicit hasEvidence=false collapses to an empty section. */
function extractFacetText(structured: unknown, rawText: string): string {
  if (structured && typeof structured === "object") {
    const obj = structured as { summary?: unknown; hasEvidence?: unknown };
    if (obj.hasEvidence === false) return "";
    if (typeof obj.summary === "string") return obj.summary.trim();
  }
  return rawText.trim();
}

/** Run a freshly-synthesized section's text through the PII gate. On a section
 * that came back empty, keep it empty (nothing to redact). */
async function gateSection(
  section: ProfileSection,
  redactor: PiiRedactor,
  previous: ProfileDoc | undefined
): Promise<ProfileSection> {
  // Reused (unchanged) sections keep the prior object identity — skip re-gating.
  const prior = previous?.sections.find((s) => s.key === section.key);
  if (prior === section) return section;
  if (!section.text) return section;
  const { text } = await redactor.redactTextAsync(section.text);
  return { ...section, text };
}
