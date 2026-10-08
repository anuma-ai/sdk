export interface PairableRow {
  query: string;
  recall: number;
  ndcg: number;
}

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
      malformed: number;
    };

const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

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
