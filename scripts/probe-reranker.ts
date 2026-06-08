import { rerankPairs, preloadReranker } from "../src/lib/memory/reranker.js";

async function main() {
  const t0 = Date.now();
  await preloadReranker();
  console.log(`model loaded in ${Date.now() - t0}ms`);

  const query = "where do I live now?";
  const docs = [
    { id: "p19", content: "Lives in Portland, Oregon" },
    { id: "p20", content: "Relocated from Portland to San Francisco in November 2025" },
    { id: "p09", content: "Has a golden retriever named Biscuit" },
    { id: "p12", content: "Drinks oat milk lattes" },
  ];

  const t1 = Date.now();
  const out = await rerankPairs(query, docs);
  console.log(`scored ${docs.length} pairs in ${Date.now() - t1}ms`);
  console.log(JSON.stringify(out, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
