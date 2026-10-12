import type { RecallDiagnostics } from "./types";

export function notifyMemoryCallback<T>(
  callback: ((value: T) => void) | undefined,
  value: T
): void {
  try {
    callback?.(value);
  } catch {
    return;
  }
}

export function factRecallDiagnostics(
  scores: number[],
  elapsedMs: number,
  options: Partial<
    Pick<
      RecallDiagnostics,
      | "vaultSize"
      | "candidateCount"
      | "truncated"
      | "decryptLast"
      | "vaultRowsDecrypted"
      | "vaultRowsEmbedded"
    >
  > & { minScore?: number; embeddingsUnavailable?: boolean; queryEmbedMs?: number } = {}
): RecallDiagnostics {
  return {
    usedBudget: "low",
    reranked: false,
    candidateCount: options.candidateCount ?? scores.length,
    ...(options.vaultSize !== undefined && { vaultSize: options.vaultSize }),
    ...(options.decryptLast !== undefined && { decryptLast: options.decryptLast }),
    ...(options.vaultRowsDecrypted !== undefined && {
      vaultRowsDecrypted: options.vaultRowsDecrypted,
    }),
    ...(options.vaultRowsEmbedded !== undefined && {
      vaultRowsEmbedded: options.vaultRowsEmbedded,
    }),
    factCount: scores.length,
    chunkCount: 0,
    admittedCount: scores.length,
    topScore: scores.length ? Math.max(...scores) : -1,
    lowestAdmittedScore: scores.length ? Math.min(...scores) : -1,
    minScoreApplied: options.minScore ?? -1,
    truncated: options.truncated ?? false,
    graphLaneCount: 0,
    temporalLaneCount: 0,
    emptyReason: scores.length ? "" : options.vaultSize === 0 ? "vault-empty" : "no-candidates",
    timings: {
      total: elapsedMs,
      prep: 0,
      factLane: elapsedMs,
      rerank: 0,
      queryEmbed: options.queryEmbedMs ?? 0,
      chunkLane: 0,
      fuse: 0,
    },
    degraded: options.embeddingsUnavailable ? ["embeddings-unavailable"] : [],
  };
}
