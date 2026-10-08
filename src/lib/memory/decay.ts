import { getLogger } from "../logger.js";

/** The verdict for a single memory. */
export type DecayVerdict = "keep" | "archive" | "delete";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Short TTL — `plan` / `ongoing_context` age out ~30 days after last touch. */
export const SHORT_TTL_MS = 30 * DAY_MS;
/** Medium TTL — `other` / untyped rows age out ~180 days after last touch. */
export const MEDIUM_TTL_MS = 180 * DAY_MS;

/**
 * `source` value carried by memories the SERVER extracted from an uploaded
 * photo (anuma-ai/nearby#114). Distinct from "manual" (the user typed it) and
 * from "auto-extracted" (this device read it out of a conversation), because it
 * is the only source whose rows are born already published — which is what earns
 * it the auto-archive exemption above.
 */
export const SOURCE_PHOTO = "photo";
/**
 * "Never" TTL — durable identity-class types (identity/preference/relationship/
 * constraint) never age-archive. Expressed as +Infinity so the age comparison
 * `now - updatedAt > ttl` is always false.
 */
export const NEVER_TTL_MS = Number.POSITIVE_INFINITY;
/**
 * How long an archived memory lingers (recoverable) before the sweep hard-
 * deletes it. ~30 days gives the user a window to restore an over-eager decay.
 */
export const HARD_DELETE_WINDOW_MS = 30 * DAY_MS;
/**
 * Grace applied after a `plan` / `ongoing_context` event's `event_time_end`
 * before it's considered "become past" and archived. Avoids archiving a plan
 * the instant its end date passes (the user may still reference it briefly).
 */
export const PAST_EVENT_GRACE_MS = 7 * DAY_MS;

/**
 * Per-type TTL + window overrides. Pass a partial to {@link classifyDecay} /
 * the sweeper to tune behavior (evaluation harnesses, tests). Anything omitted
 * falls back to {@link DEFAULT_DECAY_POLICY}.
 */
export interface DecayPolicy {
  /**
   * Age TTL (ms since `updatedAt`) per FactType. A type absent from this map —
   * or a null/unknown `factType` — uses {@link DecayPolicy.fallbackTtlMs}.
   */
  ttlByType: Record<string, number>;
  /** TTL for `null` / unknown fact types (the medium bucket). */
  fallbackTtlMs: number;
  /** How long an archived row lingers before hard delete. */
  hardDeleteWindowMs: number;
  /** Grace after a past `event_time_end` before archiving a plan/ongoing. */
  pastEventGraceMs: number;
}

/** Default policy — the locked per-type TTLs. */
export const DEFAULT_DECAY_POLICY: DecayPolicy = {
  ttlByType: {
    identity: NEVER_TTL_MS,
    preference: NEVER_TTL_MS,
    relationship: NEVER_TTL_MS,
    constraint: NEVER_TTL_MS,
    plan: SHORT_TTL_MS,
    ongoing_context: SHORT_TTL_MS,
    other: MEDIUM_TTL_MS,
  },
  fallbackTtlMs: MEDIUM_TTL_MS,
  hardDeleteWindowMs: HARD_DELETE_WINDOW_MS,
  pastEventGraceMs: PAST_EVENT_GRACE_MS,
};

/**
 * The minimal plaintext shape {@link classifyDecay} reads. Deliberately excludes
 * `content` (encrypted; never touched by decay) — the sweep selects exactly
 * these columns so it stays zero-knowledge.
 */
export interface DecayInput {
  /**
   * The row's stable id. Not read by the rule engine ({@link classifyDecay}
   * ignores it) — it is threaded through so an optional content-reading decay
   * classifier (PR5, {@link createLlmDecayClassifier}) can fetch + decrypt the
   * row for a borderline verdict. Optional so pure rule-based callers/tests can
   * omit it.
   */
  id?: string;
  /** The extractor's FactType, or null (legacy/manual/untyped → medium bucket). */
  factType: string | null;
  /** W6 temporal lane — Unix ms the event ended (range/ongoing), or null. */
  eventTimeEnd: number | null;
  /** W6 temporal lane — `point | range | ongoing | null`. */
  eventTimeKind: string | null;
  /** Unix ms of the row's last write (re-observation resets this). */
  updatedAt: number;
  /** Last distinct observation; does not change the edit timestamp. */
  lastObservedAt?: number | null;
  /** Unix ms when archived, or null when active. */
  archivedAt: number | null;
  /** `manual` | `auto-extracted` | `capsule` | null. Manual is never decayed. */
  source: string | null;
  /**
   * `trusted` | `quarantined` | null. Not read by the rule engine
   * ({@link classifyDecay} ignores it — quarantined rows still age/archive/delete
   * by RULE). It exists only so the sweeper's `isBorderline` can keep a
   * quarantined (injection-screened) row away from the optional content-reading
   * classifier, so poison content never egresses. Optional so pure rule-based
   * callers/tests can omit it (treated as not quarantined).
   */
  trustTier?: string | null;
}

/**
 * When a memory was last edited OR re-observed — the timestamp its age runs
 * from. A merge records a re-observation in `lastObservedAt` while
 * preserveUpdatedAt pins `updated_at`, so `updatedAt` alone overstates the age
 * of every fact the user keeps repeating.
 */
export function lastActivityAt(m: Pick<DecayInput, "updatedAt" | "lastObservedAt">): number {
  const observedAt = Number.isFinite(m.lastObservedAt) ? (m.lastObservedAt as number) : m.updatedAt;
  return Math.max(m.updatedAt, observedAt);
}

function resolvePolicy(policy?: Partial<DecayPolicy>): DecayPolicy {
  if (!policy) return DEFAULT_DECAY_POLICY;
  return {
    ttlByType: { ...DEFAULT_DECAY_POLICY.ttlByType, ...policy.ttlByType },
    fallbackTtlMs: policy.fallbackTtlMs ?? DEFAULT_DECAY_POLICY.fallbackTtlMs,
    hardDeleteWindowMs: policy.hardDeleteWindowMs ?? DEFAULT_DECAY_POLICY.hardDeleteWindowMs,
    pastEventGraceMs: policy.pastEventGraceMs ?? DEFAULT_DECAY_POLICY.pastEventGraceMs,
  };
}

/**
 * The age TTL for a fact type. `null` / unknown types fall to the medium
 * fallback bucket (never Infinity — untyped rows must still eventually age out).
 */
export function ttlForType(factType: string | null, policy?: Partial<DecayPolicy>): number {
  const resolved = resolvePolicy(policy);
  if (factType === null) return resolved.fallbackTtlMs;
  return resolved.ttlByType[factType] ?? resolved.fallbackTtlMs;
}

function isTimeSensitiveType(factType: string | null): boolean {
  return factType === "plan" || factType === "ongoing_context";
}

function hasFiniteTimestamps(m: DecayInput, now: number): boolean {
  return (
    Number.isFinite(now) &&
    Number.isFinite(m.updatedAt) &&
    (m.archivedAt === null || Number.isFinite(m.archivedAt))
  );
}

/**
 * Classify one memory into a decay verdict, reading only plaintext fields.
 *
 * Rules, in order (first match wins):
 *  0. Non-finite timestamps → keep (safe) + warn (corrupt row, observable).
 *  1. Already archived (`archivedAt != null`): delete once past the hard-delete
 *     window, else keep — runs REGARDLESS of `source`, so the purge clock
 *     applies to archived manual rows too.
 *  2. `source === "manual"` → keep — protects manual saves from AUTO-ARCHIVE
 *     only (rules 3/4). Delete-of-already-archived is handled above.
 *  3. `plan` / `ongoing_context` whose event has become past — `eventTimeEnd`
 *     is set AND older than `now - grace` → archive. An `ongoing` status with a
 *     null `eventTimeEnd` is still ongoing, so this rule does not fire for it.
 *  4. Age fallback — `now - updatedAt > TTL(factType)` → archive. Durable types
 *     have Infinity TTL, so this never fires for them; null/unknown use medium.
 *     EXCEPTION: a `plan`/`ongoing_context` with a still-upcoming event
 *     (`eventTimeEnd >= now`) is kept — it must not age-archive before the event
 *     happens; only rule 3 (after it passes) may archive it.
 *  5. Otherwise → keep.
 *
 * @param m     Plaintext decay inputs for one row.
 * @param now   Reference time (Unix ms). Injected for determinism.
 * @param policy Optional partial policy overriding {@link DEFAULT_DECAY_POLICY}.
 */
export function classifyDecay(
  m: DecayInput,
  now: number,
  policy?: Partial<DecayPolicy>
): DecayVerdict {
  const resolved = resolvePolicy(policy);

  if (!hasFiniteTimestamps(m, now)) {
    getLogger().warn("[memory/decay] non-finite timestamp on a memory row; keeping it", {
      now,
      updatedAt: m.updatedAt,
      archivedAt: m.archivedAt,
      factType: m.factType,
    });
    return "keep";
  }

  if (m.archivedAt !== null) {
    return now - m.archivedAt > resolved.hardDeleteWindowMs ? "delete" : "keep";
  }

  if (m.source === "manual" || m.source === SOURCE_PHOTO) return "keep";

  if (isTimeSensitiveType(m.factType) && m.eventTimeEnd !== null) {
    if (m.eventTimeEnd < now - resolved.pastEventGraceMs) return "archive";
    if (m.eventTimeEnd >= now) return "keep";
  }

  if (now - lastActivityAt(m) > ttlForType(m.factType, resolved)) return "archive";

  return "keep";
}
