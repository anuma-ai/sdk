/**
 * Unit tests for the W5 stored-entity vocabulary.
 *
 * Two things are being pinned, and they are not the same thing:
 *  1. The INDEX RULES. Every stored name must be reachable from its own text,
 *     because the decision not to union the heuristic extractor underneath this
 *     tier rests on that being true. A hole in the index is not a missed
 *     candidate, it is a silently unrecallable memory.
 *  2. The CACHE INVALIDATION. The version stamp has to see a change that leaves
 *     the row count identical, because the entity table's orphan prune does
 *     exactly that.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../db/entities/operations", () => ({
  countEntitiesOp: vi.fn(),
  listEntityNamesOp: vi.fn(),
  getEntityWriteGeneration: vi.fn(),
}));

import {
  countEntitiesOp,
  type EntityOperationsContext,
  getEntityWriteGeneration,
  listEntityNamesOp,
} from "../db/entities/operations";

import {
  buildEntityVocabulary,
  createEntityVocabularyCache,
  loadEntityVocabulary,
} from "./entityVocabulary";

const entityCtx = {} as EntityOperationsContext;

/** Names indexed under `token`, in index order. */
const namesFor = (names: string[], token: string): readonly string[] =>
  buildEntityVocabulary(names, "test").index.get(token) ?? [];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getEntityWriteGeneration).mockReturnValue(0);
});

describe("buildEntityVocabulary — index rules", () => {
  it("indexes a multi-token name under each of its content tokens", () => {
    // This is the rule that makes "sara park" reachable from a query that only
    // says "sara" — the single most common shape the heuristic got wrong.
    expect(namesFor(["sara park"], "sara")).toEqual(["sara park"]);
    expect(namesFor(["sara park"], "park")).toEqual(["sara park"]);
  });

  it("keys a multi-token name under its full normalized string as well", () => {
    expect(namesFor(["san francisco"], "san francisco")).toEqual(["san francisco"]);
  });

  it("does NOT index a multi-token name under a stopword token", () => {
    // "the" indexed would make every name containing it reachable from any
    // query containing it — a hub that pulls unrelated memories into the lane.
    expect(namesFor(["the golden gate"], "the")).toEqual([]);
    expect(namesFor(["the golden gate"], "golden")).toEqual(["the golden gate"]);
  });

  it("does NOT index a multi-token name under a token below the length floor", () => {
    expect(namesFor(["st louis"], "st")).toEqual([]);
    expect(namesFor(["st louis"], "louis")).toEqual(["st louis"]);
  });

  it("ALWAYS indexes a single-token name under itself, however short", () => {
    // A single-token name IS its own identity, so the length floor and stopword
    // set that protect multi-token names would just delete short acronyms here.
    for (const name of ["ai", "sf", "p99", "s3"]) {
      expect(namesFor([name], name)).toEqual([name]);
    }
  });

  it("indexes a single-token name that IS a stopword", () => {
    // "will" is a function word and also a person's name. The stored side is the
    // authority on what is a name; this index does not get to second-guess it.
    expect(namesFor(["will"], "will")).toEqual(["will"]);
  });

  it("falls back to raw tokens for a name whose every token is filtered out", () => {
    // Without this, "the who" is indexed under nothing and is permanently
    // unrecallable — and the no-union guarantee quietly stops holding.
    expect(namesFor(["the who"], "the")).toEqual(["the who"]);
    expect(namesFor(["the who"], "who")).toEqual(["the who"]);
    // Every token below the length floor, rather than every token a stopword.
    expect(namesFor(["up to us"], "up")).toEqual(["up to us"]);
  });

  it("does NOT trigger the raw-token fallback when one token already survived", () => {
    // "on the road" is reachable via "road", so re-indexing it under "on" would
    // add a hub key for no reachability gain.
    expect(namesFor(["on the road"], "road")).toEqual(["on the road"]);
    expect(namesFor(["on the road"], "on")).toEqual([]);
    expect(namesFor(["on the road"], "the")).toEqual([]);
  });

  it("counts distinct indexed names in `size`, not index entries", () => {
    const vocabulary = buildEntityVocabulary(["sara park", "kyoto"], "v1");
    expect(vocabulary.size).toBe(2);
    expect(vocabulary.index.size).toBeGreaterThan(2);
  });

  it("normalizes and drops empty names", () => {
    const vocabulary = buildEntityVocabulary(["  Sara Park  ", "", "   "], "v1");
    expect(vocabulary.size).toBe(1);
    expect(namesFor(["  Sara Park  "], "sara")).toEqual(["sara park"]);
  });

  it("does not repeat a name under a token it already occupies", () => {
    // "kyoto kyoto" would otherwise index the name twice under one token and
    // double its match score against a single query token.
    expect(namesFor(["kyoto kyoto"], "kyoto")).toEqual(["kyoto kyoto"]);
  });

  it("carries the version stamp through verbatim", () => {
    expect(buildEntityVocabulary(["kyoto"], "12:3").version).toBe("12:3");
  });
});

describe("loadEntityVocabulary — availability", () => {
  it("builds from the enumerated names when the table is readable", async () => {
    vi.mocked(countEntitiesOp).mockResolvedValue(2);
    vi.mocked(listEntityNamesOp).mockResolvedValue(["sara park", "kyoto"]);

    const vocabulary = await loadEntityVocabulary(entityCtx);

    expect(vocabulary?.size).toBe(2);
    expect(vocabulary?.version).toBe("2:0");
    expect(listEntityNamesOp).toHaveBeenCalledWith(entityCtx, { limit: 50_000 });
  });

  it("stays off for a multi-user context WITHOUT reading anything", async () => {
    const scoped = { userId: "u1" } as EntityOperationsContext;

    const vocabulary = await loadEntityVocabulary(scoped);

    expect(vocabulary).toBeUndefined();
    // The read is the thing being avoided: the entity table is global, so
    // enumerating it in a multi-user process pulls in every user's names.
    expect(countEntitiesOp).not.toHaveBeenCalled();
    expect(listEntityNamesOp).not.toHaveBeenCalled();
  });

  it("skips a fresh vault without enumerating it", async () => {
    vi.mocked(countEntitiesOp).mockResolvedValue(0);

    expect(await loadEntityVocabulary(entityCtx)).toBeUndefined();
    expect(listEntityNamesOp).not.toHaveBeenCalled();
  });

  it("refuses to index a vault past the ceiling", async () => {
    vi.mocked(countEntitiesOp).mockResolvedValue(50_001);
    const onFailed = vi.fn();

    expect(await loadEntityVocabulary(entityCtx, undefined, onFailed)).toBeUndefined();
    expect(listEntityNamesOp).not.toHaveBeenCalled();
    expect(onFailed).toHaveBeenCalledTimes(1);
  });

  it("never throws, whatever the read does", async () => {
    vi.mocked(countEntitiesOp).mockRejectedValue(new Error("watermelon boom"));
    const onFailed = vi.fn();

    // The heuristic extractor is the floor. A throwing enumeration must degrade
    // to it, never take the recall down with it.
    await expect(loadEntityVocabulary(entityCtx, undefined, onFailed)).resolves.toBeUndefined();
    expect(onFailed).toHaveBeenCalledTimes(1);
  });

  it("does not report a failure for expected unavailability", async () => {
    vi.mocked(countEntitiesOp).mockResolvedValue(0);
    const onFailed = vi.fn();

    await loadEntityVocabulary(entityCtx, undefined, onFailed);
    await loadEntityVocabulary({ userId: "u1" } as EntityOperationsContext, undefined, onFailed);

    // A degradation signal that fires for every new user and every server is a
    // config readout, not an alert.
    expect(onFailed).not.toHaveBeenCalled();
  });
});

describe("loadEntityVocabulary — cache invalidation", () => {
  it("reuses the cached index while the stamp is unchanged", async () => {
    vi.mocked(countEntitiesOp).mockResolvedValue(2);
    vi.mocked(listEntityNamesOp).mockResolvedValue(["sara park", "kyoto"]);
    const cache = createEntityVocabularyCache();

    const first = await loadEntityVocabulary(entityCtx, cache);
    const second = await loadEntityVocabulary(entityCtx, cache);

    expect(second).toBe(first);
    expect(countEntitiesOp).toHaveBeenCalledTimes(2);
    expect(listEntityNamesOp).toHaveBeenCalledTimes(1);
  });

  it("rebuilds when the row count moves", async () => {
    vi.mocked(countEntitiesOp).mockResolvedValue(2);
    vi.mocked(listEntityNamesOp).mockResolvedValue(["sara park", "kyoto"]);
    const cache = createEntityVocabularyCache();
    await loadEntityVocabulary(entityCtx, cache);

    vi.mocked(countEntitiesOp).mockResolvedValue(3);
    vi.mocked(listEntityNamesOp).mockResolvedValue(["sara park", "kyoto", "osaka"]);
    const rebuilt = await loadEntityVocabulary(entityCtx, cache);

    expect(rebuilt?.size).toBe(3);
    expect(listEntityNamesOp).toHaveBeenCalledTimes(2);
  });

  it("rebuilds when the write generation moves under an IDENTICAL row count", async () => {
    // The failure a count stamp cannot see. replaceMemoryEntitiesGuardedOp
    // orphan-prunes K entities and creates K others inside one writer: the count
    // is unchanged and the name set is different. A count-keyed cache then keeps
    // serving an index missing a brand-new name — a silent recall miss, which is
    // the exact failure class this whole lane exists to remove.
    vi.mocked(countEntitiesOp).mockResolvedValue(2);
    vi.mocked(listEntityNamesOp).mockResolvedValue(["sara park", "kyoto"]);
    const cache = createEntityVocabularyCache();
    await loadEntityVocabulary(entityCtx, cache);

    vi.mocked(getEntityWriteGeneration).mockReturnValue(1);
    vi.mocked(listEntityNamesOp).mockResolvedValue(["sara park", "osaka"]);
    const rebuilt = await loadEntityVocabulary(entityCtx, cache);

    expect(listEntityNamesOp).toHaveBeenCalledTimes(2);
    expect(rebuilt?.index.get("osaka")).toEqual(["osaka"]);
    expect(rebuilt?.index.get("kyoto")).toBeUndefined();
  });

  it("does not cache an unavailable result", async () => {
    vi.mocked(countEntitiesOp).mockResolvedValue(2);
    vi.mocked(listEntityNamesOp).mockRejectedValue(new Error("boom"));
    const cache = createEntityVocabularyCache();

    await loadEntityVocabulary(entityCtx, cache);

    expect(cache.get()).toBeUndefined();
  });

  it("forgets everything on clear", async () => {
    vi.mocked(countEntitiesOp).mockResolvedValue(1);
    vi.mocked(listEntityNamesOp).mockResolvedValue(["sara park"]);
    const cache = createEntityVocabularyCache();
    await loadEntityVocabulary(entityCtx, cache);

    cache.clear();
    await loadEntityVocabulary(entityCtx, cache);

    // Entity names are PII derived from decrypted content; an identity switch
    // clears this cache and must actually force a rebuild.
    expect(listEntityNamesOp).toHaveBeenCalledTimes(2);
  });
});
