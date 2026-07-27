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
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
import { noopLogger, setLogger } from "../logger";

/**
 * The shape a real client builds. `singleTenant` is the opt-in the vocabulary
 * tier gates on, and `userId` is present alongside it on purpose: the React
 * client sets both — the wallet scopes legacy `memory_entity` rows on a
 * database that is nevertheless one tenant's. A fixture without `userId` would
 * not exercise the distinction that matters.
 */
const entityCtx = {
  entityCollection: {},
  userId: "0xwallet",
  singleTenant: true,
} as unknown as EntityOperationsContext;

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
    // `<contextId>:<rowCount>:<writeGeneration>`. The context id is assigned per
    // process, so only its shape is pinned.
    expect(vocabulary?.version).toEqual(expect.stringMatching(/^\d+:2:0$/));
    expect(listEntityNamesOp).toHaveBeenCalledWith(entityCtx, { limit: 50_000 });
  });

  it("stays off for a context that has NOT declared itself single-tenant, reading nothing", async () => {
    const scoped = { entityCollection: {}, userId: "u1" } as unknown as EntityOperationsContext;

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
    await loadEntityVocabulary(
      { entityCollection: {}, userId: "u1" } as unknown as EntityOperationsContext,
      undefined,
      onFailed
    );

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

describe("loadEntityVocabulary — tenancy gate", () => {
  beforeEach(() => {
    vi.mocked(countEntitiesOp).mockResolvedValue(3);
    vi.mocked(listEntityNamesOp).mockResolvedValue(["sara park", "kyoto", "san francisco"]);
    vi.mocked(getEntityWriteGeneration).mockReturnValue(0);
  });

  it("is ON for a wallet-scoped single-tenant client — the only host the SDK ships", async () => {
    // The gate that matters. `userId` is set for every wallet-connected session
    // (it is required for encryption and the queue), so a gate keyed on
    // `userId !== undefined` reads as multi-tenant for every logged-in user and
    // turns this tier off for the entire first-party client — the measured lift
    // reaching nobody, silently and by design, with no degradation signal.
    const client = {
      entityCollection: {},
      userId: "0xabc",
      allowUnscopedRows: true,
      singleTenant: true,
    } as unknown as EntityOperationsContext;

    const vocabulary = await loadEntityVocabulary(client);

    expect(vocabulary?.size).toBe(3);
  });

  it("is OFF, and reads nothing, when tenancy was never declared", async () => {
    // Fail closed. A multi-tenant host that sets `userId` on its VAULT context
    // and forgets it here must not accidentally enumerate the global table.
    const undeclared = { entityCollection: {} } as unknown as EntityOperationsContext;

    expect(await loadEntityVocabulary(undeclared)).toBeUndefined();
    expect(countEntitiesOp).not.toHaveBeenCalled();
    expect(listEntityNamesOp).not.toHaveBeenCalled();
  });
});

describe("loadEntityVocabulary — cache identity", () => {
  it("does not serve one entity table's index to another with the same row count", async () => {
    // Row count and write generation are both process-global, so two vaults
    // holding the same number of rows stamp identically. Without a context
    // identity in the stamp the second vault is a cache HIT on the first
    // vault's names, and every one of its own entities becomes unrecallable for
    // the life of the cache.
    const cache = createEntityVocabularyCache();
    vi.mocked(getEntityWriteGeneration).mockReturnValue(0);
    vi.mocked(countEntitiesOp).mockResolvedValue(2);

    const vaultA = {
      entityCollection: {},
      singleTenant: true,
    } as unknown as EntityOperationsContext;
    const vaultB = {
      entityCollection: {},
      singleTenant: true,
    } as unknown as EntityOperationsContext;

    vi.mocked(listEntityNamesOp).mockResolvedValue(["sara park", "kyoto"]);
    const a = await loadEntityVocabulary(vaultA, cache);
    vi.mocked(listEntityNamesOp).mockResolvedValue(["hiroshi tanaka", "osaka"]);
    const b = await loadEntityVocabulary(vaultB, cache);

    expect(a?.index.has("kyoto")).toBe(true);
    expect(b?.index.has("osaka")).toBe(true);
    expect(b?.index.has("kyoto")).toBe(false);
  });

  it("still hits the cache for the same context when nothing moved", async () => {
    const cache = createEntityVocabularyCache();
    vi.mocked(getEntityWriteGeneration).mockReturnValue(0);
    vi.mocked(countEntitiesOp).mockResolvedValue(2);
    vi.mocked(listEntityNamesOp).mockResolvedValue(["sara park", "kyoto"]);
    const ctx = { entityCollection: {}, singleTenant: true } as unknown as EntityOperationsContext;

    await loadEntityVocabulary(ctx, cache);
    await loadEntityVocabulary(ctx, cache);

    expect(listEntityNamesOp).toHaveBeenCalledTimes(1);
  });
});

describe("buildEntityVocabulary — cost ceiling", () => {
  /**
   * MAX_VOCABULARY_ENTITIES exists to bound a synchronous build on the recall
   * hot path, so the bound has to hold for the vocabulary shape that costs the
   * most, not just the flat one the benchmark corpus happens to have. With an
   * array-scan dedupe this is O(bucket²) and 16k names sharing one hub token
   * took ~1.5s — three orders of magnitude past the documented ceiling, on the
   * JS thread, re-paid on every entity write.
   *
   * Generous absolute numbers: this catches a complexity class, not drift on a
   * loaded CI box.
   */
  const BUILD_CEILING_MS = 600;

  it("builds 16k names with distinct tokens well inside the ceiling", () => {
    const names = Array.from({ length: 16_000 }, (_, i) => `alpha${i} beta${i}`);
    const start = performance.now();
    buildEntityVocabulary(names, "v");
    expect(performance.now() - start).toBeLessThan(BUILD_CEILING_MS);
  });

  it("builds 16k names sharing ONE hub token inside the same ceiling", () => {
    const names = Array.from({ length: 16_000 }, (_, i) => `project ${i}alpha`);
    const start = performance.now();
    const vocabulary = buildEntityVocabulary(names, "v");
    expect(performance.now() - start).toBeLessThan(BUILD_CEILING_MS);
    expect(vocabulary.index.get("project")?.length).toBe(16_000);
  });
});

describe("buildEntityVocabulary — whitespace in stored names", () => {
  // `normalizeEntityName` is trim+lowercase; it does not normalize interior
  // whitespace. A name pasted from a web page can hold a NBSP, a newline or a
  // tab, and the query tokenizer splits on all of them. Indexing on a literal
  // space would treat the whole name as ONE token, leave it reachable only by a
  // query token that can never be produced, and break the completeness
  // guarantee that licenses not unioning the heuristic underneath this tier.
  it.each([
    ["nbsp", " "],
    ["newline", "\n"],
    ["tab", "\t"],
    ["double space", "  "],
  ])("indexes a name separated by a %s under its tokens", (_label, separator) => {
    const stored = `sara${separator}park`;
    const vocabulary = buildEntityVocabulary([stored], "v");

    expect(vocabulary.index.get("sara")).toContain(stored);
    expect(vocabulary.index.get("park")).toContain(stored);
  });
});

describe("loadEntityVocabulary — warn dedupe", () => {
  afterEach(() => {
    setLogger(noopLogger);
  });

  it("warns once per REASON even though the message interpolates a moving count", async () => {
    // Keying the dedupe on the rendered message looks equivalent and is not:
    // past the ceiling, every entity insert changes the count and mints a
    // message the set has never seen. "Warn once" then degrades into
    // warn-per-insert, retaining a string per insert for the life of the
    // process — on exactly the degraded state an operator is reading the log to
    // understand.
    const warn = vi.fn();
    const ctx = { entityCollection: {}, singleTenant: true } as unknown as EntityOperationsContext;

    // The dedupe set is module-global and earlier cases in this file have
    // already spent the "over-ceiling" reason, so take a fresh module graph —
    // including a fresh logger, which is what the fresh module will read.
    vi.resetModules();
    const ops = await import("../db/entities/operations");
    const logger = await import("../logger");
    const fresh = await import("./entityVocabulary");
    logger.setLogger({ debug: vi.fn(), info: vi.fn(), warn, error: vi.fn() });
    vi.mocked(ops.getEntityWriteGeneration).mockReturnValue(0);

    for (const count of [50_001, 50_002, 50_003]) {
      vi.mocked(ops.countEntitiesOp).mockResolvedValue(count);
      await fresh.loadEntityVocabulary(ctx);
    }

    expect(warn).toHaveBeenCalledTimes(1);
  });
});
