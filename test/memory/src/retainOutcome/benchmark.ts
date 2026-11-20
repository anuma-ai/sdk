import "dotenv/config";
import { parseArgs } from "node:util";

import { getAllVaultMemoriesOp } from "../../../../src/lib/db/memoryVault/operations.js";
import { retain } from "../../../../src/lib/memory/retain.js";
import type { VaultEmbeddingCache } from "../../../../src/lib/memoryVault/searchTool.js";
import { createVaultContext, setupDatabase } from "../longmemeval/suite.js";
import { OUTCOME_CASES, type OutcomeCase } from "./cases.js";

const { values: args } = parseArgs({
  options: { runs: { type: "string" }, json: { type: "boolean", default: false } },
});

const apiKey = process.env.PORTAL_API_KEY;
const baseUrl = process.env.ANUMA_API_URL || "https://portal.anuma-dev.ai";
const runs = Math.max(1, Math.floor(Number(args.runs ?? process.env.RUNS ?? "3")) || 3);

if (!apiKey) {
  console.error("Error: PORTAL_API_KEY is required.");
  process.exit(1);
}

type Outcome = "keep-both" | "one-memory" | "replace";

interface Observed {
  outcome: Outcome;
  action: string;
  incomingStored: boolean;
}

async function observe(c: OutcomeCase): Promise<Observed> {
  const vaultCtx = createVaultContext(await setupDatabase());
  const vaultCache: VaultEmbeddingCache = new Map();
  const ctx = { vaultCtx, embeddingOptions: { apiKey, baseUrl }, vaultCache };

  await retain(c.existing, ctx, { source: "auto-extracted", enableAutoMerge: false });
  const result = await retain(c.incoming, ctx, {
    source: "auto-extracted",
    consolidateOptions: { apiKey, baseUrl },
  });

  const live = await getAllVaultMemoriesOp(vaultCtx);
  const all = await getAllVaultMemoriesOp(vaultCtx, { includeSuperseded: true });
  const outcome: Outcome =
    live.length >= 2 ? "keep-both" : all.length > live.length ? "replace" : "one-memory";
  return {
    outcome,
    action: result.action,
    incomingStored: live.some((m) => holds(m.content, c)),
  };
}

function holds(content: string, c: OutcomeCase): boolean {
  if (!c.detail?.length) return content === c.incoming;
  const text = content.toLowerCase();
  return c.detail.every((part) => text.includes(part.toLowerCase()));
}

function correct(c: OutcomeCase, seen: Observed): boolean {
  if (c.group === "adds-detail") return seen.outcome === "one-memory" && seen.incomingStored;
  return seen.outcome === c.expect;
}

async function main(): Promise<void> {
  const groups = new Map<string, { correct: number; total: number }>();
  const misses: string[] = [];
  let factsLost = 0;
  let total = 0;

  for (const c of OUTCOME_CASES) {
    for (let run = 0; run < runs; run++) {
      const seen = await observe(c);
      const tally = groups.get(c.group) ?? { correct: 0, total: 0 };
      tally.total++;
      total++;
      const lost = c.group !== "same-fact" && !seen.incomingStored;
      if (lost) factsLost++;
      if (correct(c, seen)) tally.correct++;
      else
        misses.push(
          `${c.group}: "${c.incoming}" → ${seen.outcome} (${seen.action})${lost ? ", new fact not stored" : ""}`
        );
      groups.set(c.group, tally);
    }
  }

  const right = [...groups.values()].reduce((sum, g) => sum + g.correct, 0);
  const summary = {
    cases: OUTCOME_CASES.length,
    runs,
    accuracy: right / total,
    factsLost,
    factsLostRate: factsLost / total,
    byGroup: Object.fromEntries([...groups].map(([name, g]) => [name, `${g.correct}/${g.total}`])),
    misses: [...new Set(misses)],
  };
  if (args.json) console.log(JSON.stringify(summary, null, 2));
  else {
    console.log(`\nRetain outcome: ${right}/${total} correct, ${factsLost} new facts not stored`);
    for (const [name, g] of groups) console.log(`  ${name.padEnd(16)} ${g.correct}/${g.total}`);
    for (const miss of summary.misses) console.log(`  miss  ${miss}`);
  }
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  }
);
