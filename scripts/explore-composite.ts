/**
 * Composite recall ceiling probe.
 *
 * For each composite query, compute recall@5/10/15/20/30 to find out
 * whether the right answers are in the candidate set at all (problem =
 * matching) or just getting squeezed out of top-5 (problem = ranking).
 */
import "dotenv/config";

import { generateEmbeddings } from "../src/lib/memoryEngine/embeddings.js";
import type { EmbeddingOptions } from "../src/lib/memoryEngine/types.js";
import { rankFusedVaultMemoriesAsync } from "../src/lib/memoryVault/searchTool.js";
import { preloadReranker } from "../src/lib/memory/reranker.js";
import { VAULT_MEMORIES, BENCHMARK_QUERIES } from "../test/memory/src/vault/dataset.js";

async function main() {
  const apiKey = process.env.PORTAL_API_KEY;
  if (!apiKey) throw new Error("PORTAL_API_KEY not set");

  const embeddingOptions: EmbeddingOptions = {
    apiKey,
    baseUrl: process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai",
    cache: new Map(),
  };

  const composite = BENCHMARK_QUERIES.filter((q) => q.category === "composite");
  console.log(`Probing ${composite.length} composite queries\n`);

  await preloadReranker();

  const memoryEmbeddings = await generateEmbeddings(
    VAULT_MEMORIES.map((m) => m.content),
    embeddingOptions
  );
  const embeddedItems = VAULT_MEMORIES.map((m, i) => ({
    id: m.id,
    content: m.content,
    embedding: memoryEmbeddings[i],
    updatedAt: new Date(m.createdAt),
  }));

  const queryEmbeddings = await generateEmbeddings(
    composite.map((q) => q.query),
    embeddingOptions
  );

  const ks = [5, 10, 15, 20, 30];
  const recallSums = ks.map(() => 0);
  const perQuery: Array<{
    q: string;
    expected: string[];
    missed: string[];
    ranks: Record<string, number>;
  }> = [];

  for (let i = 0; i < composite.length; i++) {
    const q = composite[i];
    const ranked = await rankFusedVaultMemoriesAsync(q.query, queryEmbeddings[i], embeddedItems, {
      limit: 30,
      minSimilarity: 0,
      rerank: true,
    });
    const ids = ranked.map((r) => r.uniqueId);

    const ranks: Record<string, number> = {};
    for (const exp of q.expectedIds) {
      const idx = ids.indexOf(exp);
      ranks[exp] = idx === -1 ? -1 : idx + 1;
    }

    for (let ki = 0; ki < ks.length; ki++) {
      const k = ks[ki];
      const inTopK = q.expectedIds.filter((id) => ids.slice(0, k).includes(id)).length;
      recallSums[ki] += inTopK / q.expectedIds.length;
    }

    const missedAt30 = q.expectedIds.filter((id) => !ids.includes(id));
    perQuery.push({ q: q.query, expected: q.expectedIds, missed: missedAt30, ranks });
  }

  console.log("Composite recall ceiling (V2+CE rerank):");
  for (let i = 0; i < ks.length; i++) {
    console.log(
      `  recall@${ks[i].toString().padStart(2)}  ${((recallSums[i] / composite.length) * 100).toFixed(1)}%`
    );
  }
  console.log();
  console.log("Per-query rank of each expected id (rank=1 means top-1, '—' means not in top-30):");
  for (const r of perQuery) {
    const ranksStr = r.expected
      .map((id) => `${id}@${r.ranks[id] === -1 ? "—" : r.ranks[id]}`)
      .join(", ");
    console.log(`  "${r.q}"`);
    console.log(`    [${ranksStr}]`);
    if (r.missed.length > 0) {
      console.log(`    MISSED at top-30: ${r.missed.join(", ")}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
