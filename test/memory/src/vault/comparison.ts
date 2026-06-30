// Pairing logic for the benchmark's `--compare` paired-bootstrap path.
//
// Extracted from benchmark.test.ts so the silent-skip branches (no prior
// per-query data, no query overlap, malformed prior rows) are unit-tested —
// that kind of "quietly returns nothing" logic rots unnoticed inside a CLI.
// The actual bootstrap + I/O (reading the prior file) stay in the CLI; this is
// the pure pairing core.

/** A current-run row to pair against a prior run. */
export interface PairableRow {
  query: string;
  recall: number;
  ndcg: number;
}

/** A prior-run row — recall/ndcg are `unknown` because a partial file may omit
 *  or corrupt them, which is exactly what this guards against. */
export interface PriorRow {
  query: string;
  recall?: unknown;
  ndcg?: unknown;
}

export type ComparisonResult =
  | { status: "no-prior-data" }
  | { status: "no-overlap"; priorCount: number; currentCount: number }
  | {
      status: "paired";
      curRecall: number[];
      baseRecall: number[];
      curNdcg: number[];
      baseNdcg: number[];
      /** Prior rows skipped for missing/non-numeric recall or ndcg. */
      malformed: number;
    };

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Pair current results to prior rows by query text (the stable cross-run key)
 * for a paired bootstrap. Skips prior rows whose recall/ndcg is missing or
 * non-numeric — they'd otherwise feed `x - undefined = NaN` into the bootstrap
 * and silently scramble the verdict. Returns a discriminated result so the
 * caller logs the right message and only runs the bootstrap when there's real
 * overlap.
 */
export function pairForComparison(current: PairableRow[], priorRows: PriorRow[]): ComparisonResult {
  if (priorRows.length === 0) return { status: "no-prior-data" };

  const byQuery = new Map(priorRows.map((r) => [r.query, r]));
  const curRecall: number[] = [];
  const baseRecall: number[] = [];
  const curNdcg: number[] = [];
  const baseNdcg: number[] = [];
  let malformed = 0;

  for (const r of current) {
    const prior = byQuery.get(r.query);
    if (!prior) continue;
    if (!isFiniteNumber(prior.recall) || !isFiniteNumber(prior.ndcg)) {
      malformed++;
      continue;
    }
    curRecall.push(r.recall);
    baseRecall.push(prior.recall);
    curNdcg.push(r.ndcg);
    baseNdcg.push(prior.ndcg);
  }

  if (curRecall.length === 0) {
    return { status: "no-overlap", priorCount: priorRows.length, currentCount: current.length };
  }
  return { status: "paired", curRecall, baseRecall, curNdcg, baseNdcg, malformed };
}
