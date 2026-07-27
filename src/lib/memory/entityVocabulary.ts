/**
 * Stored-entity vocabulary for the W5 graph recall lane.
 *
 * The heuristic extractor in `queryEntities.ts` GUESSES which words in a query
 * might be entity names, then asks the database whether any of them exist. That
 * is backwards, and it is why it tops out at ~16% expected-id recall: the guess
 * is made without knowing the answer set, so the stopword lists have to be
 * aggressive enough to keep the guess honest, and aggressive stopwording is
 * exactly what drops real names.
 *
 * The vault already knows every canonical entity name it holds. Enumerating
 * them once, indexing them by token, and RESOLVING query tokens against that
 * closed set turns "guess and check" into a lookup. On the benchmark corpus
 * that moves lane activation from 25% of queries to 74% and expected-id recall
 * from 16.1% to 36.6% — 2.28x the RRF mass the lane contributes to fusion, with
 * zero queries regressing — while emitting FEWER candidates per query on
 * average (1.8 vs 4.9).
 *
 * That average is an observation about this corpus, NOT a structural property,
 * and it should not be read as one. Resolution is one-to-many: a query token
 * that is a token of N stored names emits all N. On the benchmark corpus the
 * widest index bucket holds 8 names and the grounded tier out-emits the
 * heuristic on 4 of 100 queries, by one candidate each — but fan-out per token
 * grows with the vocabulary, so a larger vault can invert it on a generic token
 * ("management", "2025", "meeting"). What actually bounds the `IN`-clause is
 * {@link MAX_VOCABULARY_CANDIDATES}, and what bounds the lane downstream is
 * NODE_BUDGET. Neither is the sentence "a resolved name is a name that exists".
 *
 * It is not free. Candidates now match real rows far more often, so the lane
 * activates on queries where it used to stay quiet, including hard negatives.
 * See `test/memory/src/vault/entityLane.test.ts` for the committed numbers on
 * both sides of that trade.
 *
 * COST. One indexed COUNT per recall — paid BEFORE extraction runs, so it is
 * not avoided by a query that turns out to have no seeds. On a version change,
 * one raw enumeration read plus an index build (~18ms at 16k names, measured in
 * `entityVocabulary.test.ts` rather than asserted from a design doc). Nothing
 * else — no network, no embeddings, no model. Everything here is synchronous
 * CPU work on the recall hot path, so an extraction burst that moves the
 * version on every call pays the build on every call; if that ever matters the
 * isolated fix is to rebuild off the microtask queue and serve the previous
 * index for one call.
 *
 * FAILS SOFT, ALWAYS. Every failure — a throwing read, an empty table, a vault
 * past the index ceiling, a context that has not declared itself single-tenant
 * — returns `undefined`, and the caller falls back to the heuristic extractor.
 * The deterministic path is the floor; this tier can only improve on it or get
 * out of the way.
 */

import {
  countEntitiesOp,
  type EntityOperationsContext,
  getEntityWriteGeneration,
  listEntityNamesOp,
} from "../db/entities/operations.js";
import { normalizeEntityName } from "../db/entities/types.js";
import { getLogger } from "../logger.js";

/**
 * A token -> stored-canonical-name index over the vault's entity table.
 * Immutable; rebuilt rather than mutated when the table moves.
 * @public
 */
export interface EntityVocabulary {
  /** Token -> the canonical names indexed under it. */
  readonly index: ReadonlyMap<string, readonly string[]>;
  /** Number of distinct canonical names indexed. */
  readonly size: number;
  /**
   * Opaque stamp of the entity-table state this was built from. Compare for
   * equality only — the composition is deliberately not part of the contract.
   */
  readonly version: string;
}

/**
 * Single-slot cache for a built {@link EntityVocabulary}. Deliberately NOT an
 * LRU and deliberately NOT time-based: there is exactly one vocabulary per
 * process, and it is invalidated by a data signal (the entity table's version
 * stamp) rather than by a clock. A TTL would be both slower to notice a real
 * change and impossible to test without wall-clock dependence.
 *
 * Build with {@link createEntityVocabularyCache} and hold it for the session.
 * Sharing one across two different entity tables is SAFE — the version stamp
 * carries a per-context identity, so the second vault misses the cache and
 * rebuilds rather than being served the first vault's names. Clearing it on a
 * user switch is still worth doing (entity names are derived from decrypted
 * user content and there is no reason to keep them resident), but correctness
 * no longer depends on the caller remembering to.
 * @public
 */
export interface EntityVocabularyCache {
  get(): EntityVocabulary | undefined;
  set(vocabulary: EntityVocabulary): void;
  clear(): void;
}

/**
 * Create an empty {@link EntityVocabularyCache}. Pass it on `RecallContext` to
 * reuse one built index across every recall in a session; omit it and the index
 * is rebuilt per call (correct, just wasteful).
 * @public
 */
export function createEntityVocabularyCache(): EntityVocabularyCache {
  let slot: EntityVocabulary | undefined;
  return {
    get: () => slot,
    set: (vocabulary) => {
      slot = vocabulary;
    },
    clear: () => {
      slot = undefined;
    },
  };
}

/**
 * Shortest token indexed from a MULTI-token name. Below this a token is mostly
 * inflection and prepositions ("of", "de", "st"), and indexing it makes a long
 * name reachable from a word that carries none of its identity. Single-token
 * names bypass this entirely — see {@link buildEntityVocabulary}.
 */
const MIN_INDEX_TOKEN = 3;

/**
 * Above this many entity rows, skip the vocabulary tier rather than build an
 * index of unknown size on the recall path. ~5ms to build at 16k names, so this
 * is roughly a 15ms ceiling — well past any vault observed in the field, and
 * present so that "unbounded" is never the answer.
 */
const MAX_VOCABULARY_ENTITIES = 50_000;

/**
 * Cap on grounded candidates emitted per query. Measured identical retrieval at
 * 4, 8 and 16 on the benchmark corpus, where mean emission is 1.8 — so this is
 * slack, not a tuning knob, and it exists to bound the `IN`-clause rather than
 * to shape ranking.
 */
export const MAX_VOCABULARY_CANDIDATES = 16;

/**
 * Tokens never indexed from a multi-token name.
 *
 * NOT the same set as the heuristic extractor's `FALLBACK_STOPWORDS`, and not
 * interchangeable with it. That set filters QUERY tokens, where the cost of a
 * false positive is one wasted `IN`-clause slot. This set filters STORED name
 * tokens, where a false positive makes every name containing a common word
 * reachable from any query containing it — a hub that pulls unrelated memories
 * into the lane. So it holds function words and conversational filler and
 * nothing else: it must not drop a token that could be part of a real name.
 */
/**
 * Split a normalized name into its tokens.
 *
 * `/\s+/`, NOT `" "`. `normalizeEntityName` is `trim().toLowerCase()` — it does
 * not collapse or normalize interior whitespace — so a stored canonical can
 * legitimately hold a newline, a tab or a NBSP, which is routine when the
 * memory text the write side extracted from was pasted from a web page.
 * Splitting on a literal space treats a NBSP-joined "sara park" as ONE token,
 * indexes it only under its own full string, and leaves it unreachable:
 * {@link TOKEN_REGEX} on the query side splits on all whitespace, so it never
 * produces the single fused token that would be needed to match. That breaks
 * the completeness guarantee in {@link buildEntityVocabulary} — the one that
 * licenses not unioning the heuristic underneath this tier — for a case where
 * the heuristic itself DOES match, since its `\s+` inter-token pattern emits
 * the fused surface verbatim. Both tiers must agree on what a token is.
 */
export function nameTokens(name: string): string[] {
  return name.split(/\s+/u).filter(Boolean);
}

const VOCABULARY_STOPWORDS = new Set(
  (
    "a an and or but not if then than because so too also just very really " +
    "about above after again against all am any anyone anybody anything are " +
    "around as at be been being before behind below between both by can cannot " +
    "could did do does doing done down during each ever every everybody " +
    "everyone everything for from get gets getting go goes going gone got had " +
    "has have having he her here hers him his i in into is it its like may me " +
    "might mine more most must my near of off okay on once only onto other our " +
    "ours out over own please said same say says see seen shall she should " +
    "since some somebody someone something soon still such that the their " +
    "theirs them there these they this those through to under until up us was " +
    "we were what whats when where which while who whom whose why will with " +
    "without would yeah yep yes ok user use used using new set setup how"
  ).split(" ")
);

/**
 * Build the token index. Pure and synchronous — `names` is whatever the caller
 * enumerated and `version` is an opaque stamp it will compare later.
 *
 * INDEXING RULES, and why each one is load-bearing:
 *  - A multi-token name is indexed under each of its tokens that is long enough
 *    and not a stopword. This is what makes "sara park" reachable from "sara".
 *  - A SINGLE-token name is ALWAYS indexed under itself, regardless of length
 *    or stopword status, so short acronyms ("ai", "sf", "p99") survive. A
 *    single-token name IS its own identity; there is no hub risk.
 *  - COMPLETENESS FALLBACK: a multi-token name with no surviving tokens is
 *    indexed under its raw tokens anyway.
 *  - Every multi-token name is also keyed under its full normalized string.
 *
 * The completeness fallback is what licenses the caller's decision NOT to union
 * the heuristic underneath this tier. The argument: the heuristic can only
 * match a stored name `N` by emitting a gram whose normalized string equals
 * `N`, which means every token of `N` appears in the query's token set. Either
 * some token of `N` survives filtering and is an index key, or none does and
 * the fallback indexes `N` under its raw tokens. Either way at least one token
 * of `N` is both an index key and a query token, so this tier matches `N` too.
 * Therefore this tier returning nothing implies the heuristic would also have
 * matched nothing, and falling back would add candidates that cannot hit.
 *
 * That argument holds only while BOTH tiers tokenize identically, which is why
 * `queryEntities.ts` shares one `TOKEN_REGEX` between them and why the property
 * test in `queryEntities.test.ts` checks every corpus name round-trips. If that
 * test is ever weakened, the no-union decision loses its justification.
 *
 * The full-name key is inert against the current single-token matcher (a query
 * token never contains a space) and the completeness argument does NOT rest on
 * it. It is one map entry per multi-token name and it makes a future
 * gram-probing matcher a pure addition rather than a re-index.
 */
export function buildEntityVocabulary(names: readonly string[], version: string): EntityVocabulary {
  // Buckets are Sets, not arrays, purely so the duplicate-row guard is O(1).
  // With `bucket.includes(name)` the build is O(bucket²) in the size of the
  // LARGEST bucket, which makes MAX_VOCABULARY_ENTITIES stop bounding the cost
  // it exists to bound: 16k names sharing one hub token measured 1.5s, against
  // 18ms for the same 16k names with distinct tokens. The ceiling has to hold
  // for the skewed vocabulary too, not just the flat one we happen to have.
  const buckets = new Map<string, Set<string>>();
  const indexed = new Set<string>();
  const push = (token: string, name: string): void => {
    let bucket = buckets.get(token);
    if (!bucket) {
      bucket = new Set();
      buckets.set(token, bucket);
    }
    bucket.add(name);
    indexed.add(name);
  };

  for (const raw of names) {
    const name = normalizeEntityName(raw);
    if (!name) continue;
    const tokens = nameTokens(name);
    if (tokens.length === 0) continue;
    const single = tokens.length === 1;
    let indexedAny = false;
    for (const token of new Set(tokens)) {
      if (single ? token.length < 2 : token.length < MIN_INDEX_TOKEN) continue;
      if (!single && VOCABULARY_STOPWORDS.has(token)) continue;
      push(token, name);
      indexedAny = true;
    }
    // A name like "the who" or "on the road" has no surviving token. Leaving it
    // unindexed would make it unreachable, and the no-union decision above
    // assumes every stored name is reachable.
    if (!indexedAny) for (const token of new Set(tokens)) push(token, name);
    if (!single) push(name, name);
  }

  const index = new Map<string, readonly string[]>();
  for (const [token, bucket] of buckets) index.set(token, [...bucket]);
  return { index, size: indexed.size, version };
}

/** Reason codes already warned about in this process. */
const warnedReasons = new Set<string>();

/**
 * Warn once per REASON, not per message. A persistently failing enumeration
 * must be observable, but it happens on every recall — one line per call would
 * bury the log it is supposed to surface.
 *
 * Keying the dedupe on the rendered message looks equivalent and is not: both
 * messages below interpolate a value that moves (the live row count, an error
 * string that may carry a rowid). On a vault sitting past the index ceiling
 * every single entity insert changes the count, mints a message the set has
 * never seen, and emits another warning — "warn once" degrading into
 * warn-per-insert while the set grows without bound for the life of the
 * process, on exactly the degraded state an operator is trying to read the log
 * for. The reason code is fixed, so the first line wins and the rest are quiet.
 */
function warnOnce(reason: string, message: string): void {
  if (warnedReasons.has(reason)) return;
  warnedReasons.add(reason);
  getLogger().warn(`[memory/entityVocabulary] ${message}`);
}

/**
 * Stable per-process id for an entity context's identity, so the version stamp
 * can distinguish two vaults that happen to hold the same number of rows.
 *
 * Keyed on the `entityCollection` object because that — not the name list, not
 * the row count — is what decides which rows an enumeration reads. A WeakMap so
 * a closed database's entry is collectable.
 */
const contextIdentities = new WeakMap<object, number>();
let nextContextIdentity = 0;

function contextIdentity(entityCtx: EntityOperationsContext): number {
  const key = entityCtx.entityCollection as unknown as object;
  let id = contextIdentities.get(key);
  if (id === undefined) {
    id = ++nextContextIdentity;
    contextIdentities.set(key, id);
  }
  return id;
}

/**
 * Load the vocabulary for `entityCtx`, reusing `cache` when the entity table
 * has not moved. Never throws; returns `undefined` for every flavour of
 * unavailable, and the caller falls back to the heuristic extractor.
 *
 * The version stamp is `${contextId}:${rowCount}:${writeGeneration}`.
 *
 * Row count alone is not sound: an orphan-prune that destroys K entities while
 * creating K others leaves the count identical and the name set different, so a
 * count-keyed cache would serve a vocabulary missing a brand-new name — the
 * exact silent recall miss this tier exists to remove. The generation counter
 * closes that; see `getEntityWriteGeneration`.
 *
 * Count and generation together are still not sound ACROSS VAULTS. Both are
 * process-global, so two different entity tables holding the same number of
 * rows stamp identically, and one cache shared between them serves the first
 * vault's names to the second — every query resolving against a name set that
 * is not the vault's own. {@link EntityVocabularyCache} is public API and the
 * hook wiring holds one for the lifetime of the component, so "the caller will
 * clear it on an identity change" is a docstring, not a mechanism. The context
 * identity makes it a mechanism.
 *
 * `onFailed` fires ONLY for a genuine outage — an unreadable table, or a vault
 * past the index ceiling. It deliberately does not fire for a context that has
 * not opted in, or for an empty table: those are expected states, and a
 * degradation signal that fires on every recall is a config readout rather than
 * an alert.
 */
export async function loadEntityVocabulary(
  entityCtx: EntityOperationsContext,
  cache?: EntityVocabularyCache,
  onFailed?: () => void
): Promise<EntityVocabulary | undefined> {
  // TENANCY POSTURE — OPT IN, AND FAIL CLOSED. The `entity` table is global
  // vocabulary with no owner, so enumerating it in a multi-tenant process would
  // materialise every user's entity names into one index: a cost nobody has
  // measured against a real multi-tenant dataset, and other users' names held
  // in memory even though lookups stay scoped by `memory_entity.user_id`.
  //
  // The discriminator is an EXPLICIT `singleTenant` declaration, not the
  // presence of `userId`. `userId` answers "is this read user-scoped", which is
  // a different question: the React client sets it to the connected wallet to
  // scope legacy `memory_entity` rows while being a physically single-tenant
  // per-wallet database — so a `userId`-keyed gate reads as multi-tenant for
  // every logged-in user and turns this tier off for the entire first-party
  // client. This repo already litigated exactly that ambiguity on the vault
  // side: `VaultMemoryOperationsContext.singleTenant` exists so the decay
  // sweep's scope guard stops "inferring safety from walletAddress". Same
  // discriminator, same reason.
  //
  // Fail closed, so a context that declares nothing gets the heuristic rather
  // than a silent global enumeration — which also means a multi-tenant host
  // that sets `userId` on its vault context but forgets it here cannot
  // accidentally opt in. Turning the tier on for a real multi-user server means
  // user-scoped enumeration through the indexed `memory_entity.user_id` join —
  // a new op with its own measurement, not an edit to this branch.
  if (entityCtx.singleTenant !== true) return undefined;
  try {
    const count = await countEntitiesOp(entityCtx);
    // A fresh vault has nothing to resolve against. Correct to skip: an empty
    // index would match nothing and the heuristic is strictly better than that.
    if (count === 0) return undefined;
    if (count > MAX_VOCABULARY_ENTITIES) {
      warnOnce(
        "over-ceiling",
        `skipping the vocabulary tier: ${count} entities exceeds the ${MAX_VOCABULARY_ENTITIES} index ceiling`
      );
      onFailed?.();
      return undefined;
    }
    const version = `${contextIdentity(entityCtx)}:${count}:${getEntityWriteGeneration()}`;
    const cached = cache?.get();
    if (cached && cached.version === version) return cached;

    const names = await listEntityNamesOp(entityCtx, { limit: MAX_VOCABULARY_ENTITIES });
    if (names.length === 0) return undefined;
    const built = buildEntityVocabulary(names, version);
    cache?.set(built);
    return built;
  } catch (err) {
    warnOnce(
      "read-failed",
      `entity vocabulary unavailable; falling back to the heuristic extractor: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    onFailed?.();
    return undefined;
  }
}
