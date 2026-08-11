/**
 * Work counters for the memory performance harness.
 *
 * The gate runs on COUNTS, not wall-clock. Wall-clock on a laptop is dominated
 * by whatever else the machine is doing, and a shared CI runner is worse — a
 * time-based threshold there is either so loose it never fires or so tight it
 * fires every other week. The costs the memory pipeline actually pays are
 * countable and integral: how many rows a recall loads out of the vault, how
 * many of those it decrypts, how many stored vectors it JSON.parses, how many
 * documents BM25 re-tokenizes per ranking pass, how many (query, doc) pairs the
 * cross-encoder is handed, how many full-vault scans one retained fact triggers.
 * Given a fixed corpus those are a pure function of the code path, so a baseline
 * can pin them exactly and any extra work a change introduces shows up as an
 * integer that moved.
 *
 * Every counter here is incremented from a vitest module wrapper placed around a
 * DEPENDENCY of the code under test (see `benchmark.test.ts`) — the DB ops, the
 * embedder, the decryptor, the BM25 scorer, the reranker. Nothing in `src/` is
 * modified or instrumented, which is what lets this harness measure files that
 * other in-flight work owns.
 */

/**
 * One scenario's worth of work. Field names read as "how many X" so a diff of
 * two snapshots is legible without a legend.
 */
export interface PerfCounters {
  /** `generateEmbedding` calls — one per query / per fact written. */
  embedQueries: number;
  /** `generateEmbeddings` (batch) calls. */
  embedBatches: number;
  /** Texts embedded across both entry points. */
  embedTexts: number;

  /** `getAllVaultMemoriesOp` calls — each one is a whole-vault load. */
  vaultFullLoads: number;
  /** Rows returned by those loads. This is the O(n) term the legacy read path pays. */
  vaultFullRows: number;
  /** `getVaultCandidateKeysOp` calls (projected, blob-free key scan). */
  vaultKeyScans: number;
  /** Keys returned by the key scan. */
  vaultKeyRows: number;
  /** `getVaultEmbeddingsByIdsOp` calls (embedding column, cache misses only). */
  vaultVectorLoads: number;
  /**
   * Rows returned by those calls. On the projected path this is exactly the
   * number of stored embedding vectors that get `JSON.parse`d.
   */
  vaultVectorRows: number;
  /** `getVaultMemoriesByIdsOp` calls (the decrypt-last admission window). */
  vaultRowLoads: number;
  /** Rows returned by those calls. */
  vaultRowRows: number;
  /**
   * `decryptVaultMemoryFields` calls — exactly one per row materialised into a
   * `StoredVaultMemory`. The whole point of the decrypt-last path is to shrink
   * this from "the vault" to "the admission window".
   */
  vaultDecrypts: number;
  /** `getActiveVaultMemoryIdsOp` calls (graph lane's id filter). */
  vaultActiveIdScans: number;
  /** `countActiveVaultMemoriesOp` calls (graph-traversal density hint). */
  vaultCounts: number;

  /** `getMemoriesByEventTimeOp` calls (temporal lane). */
  temporalScans: number;
  /** Candidate rows the temporal lane pulled. */
  temporalRows: number;
  /** `getMemoriesByEntityNamesOp` calls (graph lane). */
  entityLookups: number;
  /** Memories the graph lane resolved from the query's entities. */
  entityMemories: number;

  /**
   * BM25 ranking passes: one per query scored against a corpus, whether that
   * went through `scoreBM25` (tokenize-and-score) or `scoreBM25Prepared`
   * (score against an already-tokenized corpus). This counts how many times the
   * ranker RANKS, which is a property of the pipeline's shape and stays put when
   * the corpus tokenization is hoisted out of the loop.
   */
  bm25Passes: number;
  /**
   * Corpus tokenizations: how many times a document set was tokenized and its
   * document frequencies built. Separated from {@link bm25Passes} because that
   * is exactly the axis a tokenize-once index moves — N passes over one corpus
   * go from N preparations to 1 while the pass count is unchanged.
   */
  bm25Prepares: number;
  /**
   * Documents tokenized across all of those preparations (Σ of each one's corpus
   * size). This is the real tokenization work, and the number to read when
   * asking what a BM25 change bought: a pass that scores against a shared
   * prepared corpus adds nothing here.
   */
  bm25DocsTokenized: number;

  /** `rerankPairs` calls. */
  rerankCalls: number;
  /** (query, doc) pairs handed to the cross-encoder across those calls. */
  rerankPairs: number;

  /** `searchChunksOp` calls (chunk lane). */
  chunkSearches: number;
  /** Chunk hits returned. */
  chunkHits: number;
  /**
   * `decryptJsonField` calls — the chunk COLUMN decrypt (sdk#880).
   *
   * Chunk text is encrypted at rest, so `readJsonField` decrypts the whole
   * `MessageChunk[]` per message it touches. Counted on its own axis because it
   * scales with messages-touched, which is a different axis from `chunkSearches`
   * (calls) and `chunkHits` (results) — a change that widened the chunk scan
   * would move this without moving either of those.
   *
   * Before #880 this was structurally 0: the fixture seeded plaintext chunks, so
   * `readJsonField`'s `isEncrypted` branch never fired and the gate could not see
   * the decrypt cost at all. The fixture now seeds real ciphertext.
   */
  chunkFieldDecrypts: number;

  /** Vault row creates (`createVaultMemoryOp` + `createSupersedingMemoryOp`). */
  vaultCreates: number;
  /** `updateVaultMemoryOp` calls (the merge / consolidate write path). */
  vaultUpdates: number;
  /**
   * `updateVaultMemoryEmbeddingOp` calls — the fire-and-forget re-embed
   * writeback. Should be 0 in every scenario here: a non-zero value means the
   * fixture's stored vectors stopped being usable and the harness is silently
   * re-embedding the corpus instead of measuring the read path.
   */
  vaultVectorWrites: number;
}

function zeroed(): PerfCounters {
  return {
    embedQueries: 0,
    embedBatches: 0,
    embedTexts: 0,
    vaultFullLoads: 0,
    vaultFullRows: 0,
    vaultKeyScans: 0,
    vaultKeyRows: 0,
    vaultVectorLoads: 0,
    vaultVectorRows: 0,
    vaultRowLoads: 0,
    vaultRowRows: 0,
    vaultDecrypts: 0,
    vaultActiveIdScans: 0,
    vaultCounts: 0,
    temporalScans: 0,
    temporalRows: 0,
    entityLookups: 0,
    entityMemories: 0,
    bm25Passes: 0,
    bm25Prepares: 0,
    bm25DocsTokenized: 0,
    rerankCalls: 0,
    rerankPairs: 0,
    chunkSearches: 0,
    chunkHits: 0,
    chunkFieldDecrypts: 0,
    vaultCreates: 0,
    vaultUpdates: 0,
    vaultVectorWrites: 0,
  };
}

/**
 * The live counter object the module wrappers increment.
 *
 * A mutable module singleton rather than a passed-around handle: the wrappers
 * live inside `vi.mock` factories, which are hoisted above every import in the
 * test file, so they can only reach shared state through a module they import
 * themselves. Reset between scenarios via {@link resetCounters}.
 */
export const counters: PerfCounters = zeroed();

/** Zero every counter. Call at the start of each scenario. */
export function resetCounters(): void {
  Object.assign(counters, zeroed());
}

/** Copy the current values so a scenario's result survives the next reset. */
export function snapshotCounters(): PerfCounters {
  return { ...counters };
}
