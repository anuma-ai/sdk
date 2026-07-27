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
 * zero queries regressing — while emitting FEWER candidates per query (1.8 vs
 * 4.9), because a resolved name is a name that exists.
 *
 * It is not free. Candidates now match real rows far more often, so the lane
 * activates on queries where it used to stay quiet, including hard negatives.
 * See `test/memory/src/vault/entityLane.test.ts` for the committed numbers on
 * both sides of that trade.
 *
 * COST. One indexed COUNT per recall. On a version change, one raw enumeration
 * read plus an index build (~5ms at 16k names). Nothing else — no network, no
 * embeddings, no model. Everything here is synchronous CPU work on the recall
 * hot path, so an extraction burst that moves the version on every call pays
 * the build on every call; if that ever matters the isolated fix is to rebuild
 * off the microtask queue and serve the previous index for one call.
 *
 * FAILS SOFT, ALWAYS. Every failure — a throwing read, an empty table, a vault
 * past the index ceiling, a multi-user context — returns `undefined`, and the
 * caller falls back to the heuristic extractor. The deterministic path is the
 * floor; this tier can only improve on it or get out of the way.
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
 * Clear it whenever the underlying identity changes — entity names are derived
 * from decrypted user content and must not survive a user switch.
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
  const index = new Map<string, string[]>();
  const indexed = new Set<string>();
  const push = (token: string, name: string): void => {
    let bucket = index.get(token);
    if (!bucket) {
      bucket = [];
      index.set(token, bucket);
    }
    if (!bucket.includes(name)) bucket.push(name);
    indexed.add(name);
  };

  for (const raw of names) {
    const name = normalizeEntityName(raw);
    if (!name) continue;
    const tokens = name.split(" ");
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

  return { index, size: indexed.size, version };
}

/** Messages already warned about in this process. */
const warnedMessages = new Set<string>();

/**
 * Warn once per distinct message. A persistently failing enumeration must be
 * observable, but it happens on every recall — one line per call would bury the
 * log it is supposed to surface.
 */
function warnOnce(message: string): void {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  getLogger().warn(`[memory/entityVocabulary] ${message}`);
}

/**
 * Load the vocabulary for `entityCtx`, reusing `cache` when the entity table
 * has not moved. Never throws; returns `undefined` for every flavour of
 * unavailable, and the caller falls back to the heuristic extractor.
 *
 * The version stamp is `${rowCount}:${writeGeneration}`. Row count alone is not
 * sound: an orphan-prune that destroys K entities while creating K others
 * leaves the count identical and the name set different, so a count-keyed cache
 * would serve a vocabulary missing a brand-new name — the exact silent recall
 * miss this tier exists to remove. The generation counter closes that; see
 * `getEntityWriteGeneration`.
 *
 * `onFailed` fires ONLY for a genuine outage — an unreadable table, or a vault
 * past the index ceiling. It deliberately does not fire for a multi-user
 * context or an empty table: those are expected states, and a degradation
 * signal that fires on every recall for every new user is a config readout
 * rather than an alert.
 */
export async function loadEntityVocabulary(
  entityCtx: EntityOperationsContext,
  cache?: EntityVocabularyCache,
  onFailed?: () => void
): Promise<EntityVocabulary | undefined> {
  // MULTI-USER POSTURE. The `entity` table is global vocabulary with no owner,
  // so a server would materialise every user's entity names into one process's
  // index — at a cost nobody has measured against a real multi-tenant dataset,
  // and holding other users' names in memory even though lookups stay scoped by
  // `memory_entity.user_id`. Servers keep the (now gate-free) heuristic. This is
  // an expected unavailability, not a failure: no warning, no degradation
  // signal. Turning it on means user-scoped enumeration through the indexed
  // `memory_entity.user_id` join — a new op with its own measurement, not an
  // edit to this branch.
  if (entityCtx.userId !== undefined) return undefined;
  try {
    const count = await countEntitiesOp(entityCtx);
    // A fresh vault has nothing to resolve against. Correct to skip: an empty
    // index would match nothing and the heuristic is strictly better than that.
    if (count === 0) return undefined;
    if (count > MAX_VOCABULARY_ENTITIES) {
      warnOnce(
        `skipping the vocabulary tier: ${count} entities exceeds the ${MAX_VOCABULARY_ENTITIES} index ceiling`
      );
      onFailed?.();
      return undefined;
    }
    const version = `${count}:${getEntityWriteGeneration()}`;
    const cached = cache?.get();
    if (cached && cached.version === version) return cached;

    const names = await listEntityNamesOp(entityCtx, { limit: MAX_VOCABULARY_ENTITIES });
    if (names.length === 0) return undefined;
    const built = buildEntityVocabulary(names, version);
    cache?.set(built);
    return built;
  } catch (err) {
    warnOnce(
      `entity vocabulary unavailable; falling back to the heuristic extractor: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    onFailed?.();
    return undefined;
  }
}
