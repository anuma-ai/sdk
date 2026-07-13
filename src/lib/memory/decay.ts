/**
 * Temporal decay classifier (PR2) — pure, DB-free, unit-testable.
 *
 * Decides whether a stored memory should be kept, archived (soft, recoverable),
 * or hard-deleted, based ONLY on its plaintext columns. This is the
 * zero-knowledge core of the decay sweep: it never sees `content` and never
 * triggers a signature/decrypt, so it can run wherever a wallet key is NOT
 * loaded. The sweep worker ({@link ./decayWorker}) feeds it raw rows selected
 * via `unsafeFetchRaw` and materializes Models only for the transitions.
 *
 * Lifecycle (mirrors the timestamp state machine in db/schema.ts):
 *   active   → archived  (set `archived_at`)   — recoverable, drops out of recall
 *   archived → deleted   (set `is_deleted`)    — terminal, after HARD_DELETE_WINDOW
 *
 * Per-type TTL policy (the "becomes past" intuition):
 *   - identity / preference / relationship / constraint → never age-archive
 *     (durable facts about who the user is; Infinity TTL).
 *   - plan / ongoing_context → short TTL (they go stale as time moves on).
 *   - other / null (untyped/legacy) → medium TTL.
 * `source === "manual"` memories are NEVER decayed (user-curated).
 */

/** The verdict for a single memory. */
export type DecayVerdict = "keep" | "archive" | "delete";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Short TTL — `plan` / `ongoing_context` age out ~30 days after last touch. */
export const SHORT_TTL_MS = 30 * DAY_MS;
/** Medium TTL — `other` / untyped rows age out ~180 days after last touch. */
export const MEDIUM_TTL_MS = 180 * DAY_MS;
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
  /** The extractor's FactType, or null (legacy/manual/untyped → medium bucket). */
  factType: string | null;
  /** W6 temporal lane — Unix ms the event ended (range/ongoing), or null. */
  eventTimeEnd: number | null;
  /** W6 temporal lane — `point | range | ongoing | null`. */
  eventTimeKind: string | null;
  /** Unix ms of the row's last write (re-observation resets this). */
  updatedAt: number;
  /** Unix ms when archived, or null when active. */
  archivedAt: number | null;
  /** `manual` | `auto-extracted` | `capsule` | null. Manual is never decayed. */
  source: string | null;
}

/** Merge a partial policy over the default. */
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

/**
 * Classify one memory into a decay verdict, reading only plaintext fields.
 *
 * Rules, in order (first match wins):
 *  1. `source === "manual"` → keep (user-curated; never decayed).
 *  2. Already archived (`archivedAt != null`): delete once past the hard-delete
 *     window, else keep (still recoverable).
 *  3. `plan` / `ongoing_context` whose event has become past — `eventTimeEnd`
 *     is set AND older than `now - grace` → archive. An `ongoing` status with a
 *     null `eventTimeEnd` is still ongoing, so this rule does not fire for it.
 *  4. Age fallback — `now - updatedAt > TTL(factType)` → archive. Durable types
 *     have Infinity TTL, so this never fires for them; null/unknown use medium.
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

  // (1) Manual saves are user-curated — never decayed.
  if (m.source === "manual") return "keep";

  // (2) Already archived: hard-delete only after the recovery window elapses.
  if (m.archivedAt !== null) {
    return now - m.archivedAt > resolved.hardDeleteWindowMs ? "delete" : "keep";
  }

  // (3) "Becomes past" types with a concluded event → archive. Keyed on
  // event_time_end so an ongoing status with no end (still ongoing) is skipped
  // here and only ages out via the fallback below.
  if (m.factType === "plan" || m.factType === "ongoing_context") {
    if (m.eventTimeEnd !== null && m.eventTimeEnd < now - resolved.pastEventGraceMs) {
      return "archive";
    }
  }

  // (4) Age fallback — stale past its per-type TTL. Infinity for durable types.
  if (now - m.updatedAt > ttlForType(m.factType, resolved)) return "archive";

  // (5) Still fresh / durable.
  return "keep";
}
