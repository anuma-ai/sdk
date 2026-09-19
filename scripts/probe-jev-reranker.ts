/**
 * Side-by-side probe: on-device cross-encoder vs Jev, on the same shortlist.
 *
 * Mirrors `probe-reranker.ts` so the two are directly comparable. The fixture
 * is the supersession case the CE was tuned on — "where do I live now?" should
 * rank the relocation above the stale residence, and both above the dog.
 *
 *   ANUMA_PORTAL_BASE_URL=http://localhost:8080 \
 *   ANUMA_API_KEY=sk-... \
 *   pnpm tsx scripts/probe-jev-reranker.ts
 *
 * The portal holds the vendor credential; `ANUMA_API_KEY` is the caller's own
 * portal key, not a TypeSafe one.
 */
import { rerankPairsWithJev } from "../src/lib/memory/jevReranker.js";
import { preloadReranker, rerankPairs, type RerankedItem } from "../src/lib/memory/reranker.js";

const QUERY = "where do I live now?";

const DOCS = [
  { id: "p19", content: "Lives in Portland, Oregon" },
  { id: "p20", content: "Relocated from Portland to San Francisco in November 2025" },
  { id: "p09", content: "Has a golden retriever named Biscuit" },
  { id: "p12", content: "Drinks oat milk lattes" },
];

function show(label: string, ms: number, out: RerankedItem[]): void {
  console.log(`\n${label} — ${ms}ms`);
  for (const [i, r] of out.entries()) {
    console.log(`  ${i + 1}. ${r.score.toFixed(4)}  ${r.id}  ${r.content}`);
  }
}

async function crossEncoder(): Promise<void> {
  const t0 = Date.now();
  await preloadReranker();
  console.log(`cross-encoder model loaded in ${Date.now() - t0}ms`);

  const t1 = Date.now();
  show("cross-encoder", Date.now() - t1, await rerankPairs(QUERY, DOCS));
}

async function jev(): Promise<void> {
  const apiKey = process.env.ANUMA_API_KEY;
  if (!apiKey) {
    console.log("\njev — skipped (set ANUMA_API_KEY)");
    return;
  }
  const t0 = Date.now();
  const out = await rerankPairsWithJev(QUERY, DOCS, { apiKey });
  show("jev", Date.now() - t0, out);
}

async function main(): Promise<void> {
  console.log(`query: ${QUERY}`);
  // Sequential, not concurrent: the CE saturates the CPU while loading and
  // would distort the Jev timing if they overlapped.
  await crossEncoder().catch((err) => console.log(`\ncross-encoder unavailable: ${err}`));
  await jev();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
