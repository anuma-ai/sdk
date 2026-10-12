export interface PerfCounters {
  embedQueries: number;
  embedBatches: number;
  embedTexts: number;

  vaultFullLoads: number;
  vaultFullRows: number;
  vaultKeyScans: number;
  vaultKeyRows: number;
  vaultVectorLoads: number;
  vaultVectorRows: number;
  vaultRowLoads: number;
  vaultRowRows: number;
  vaultDecrypts: number;
  vaultActiveIdScans: number;
  vaultCounts: number;

  temporalScans: number;
  temporalRows: number;
  entityLookups: number;
  entityMemories: number;

  bm25Passes: number;
  bm25Prepares: number;
  bm25DocsTokenized: number;

  rerankCalls: number;
  rerankPairs: number;

  chunkSearches: number;
  chunkHits: number;

  vaultCreates: number;
  vaultUpdates: number;
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
    vaultCreates: 0,
    vaultUpdates: 0,
    vaultVectorWrites: 0,
  };
}

export const counters: PerfCounters = zeroed();

export function resetCounters(): void {
  Object.assign(counters, zeroed());
}

export function snapshotCounters(): PerfCounters {
  return { ...counters };
}
