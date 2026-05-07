#!/usr/bin/env tsx
/**
 * Aggregate LongMemEval per-question transcripts (saved to
 * ~/.cache/longmemeval/transcripts/<id>_vault.json) into a summary
 * that mirrors the LongMemEvalSummary shape. Use this as a fallback
 * when the main run crashes during teardown before the JSON output
 * gets written.
 *
 * Usage:  npx tsx scripts/aggregate-longmem-transcripts.ts [--strategy vault|engine]
 */
import { readdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

import { loadLongMemEvalDataset } from "../test/memory/src/longmemeval/dataset.js";

const { values: args } = parseArgs({
  options: {
    strategy: { type: "string", default: "vault" },
    variant: { type: "string", default: "oracle" },
  },
});

const STRATEGY = args.strategy === "engine" ? "engine" : "vault";
const VARIANT = args.variant === "s" ? "s" : "oracle";
const TRANSCRIPTS_DIR = join(homedir(), ".cache", "longmemeval", "transcripts");

interface Transcript {
  questionId: string;
  isCorrect: boolean;
  retrieval?: { precision?: number; recall?: number };
  strategy?: string;
}

async function main() {
  const all = await readdir(TRANSCRIPTS_DIR);
  const suffix = STRATEGY === "vault" ? "_vault.json" : ".json";
  const files = all.filter((f) => {
    if (STRATEGY === "vault") return f.endsWith("_vault.json");
    return f.endsWith(".json") && !f.endsWith("_vault.json");
  });

  if (files.length === 0) {
    console.error(`No ${STRATEGY} transcripts found in ${TRANSCRIPTS_DIR}`);
    process.exit(1);
  }

  const dataset = await loadLongMemEvalDataset(VARIANT === "s" ? "s" : "oracle");
  const typeById = new Map(dataset.map((e) => [e.question_id, e.question_type]));

  const transcripts: Array<Transcript & { qtype: string }> = [];
  for (const f of files) {
    const raw = await readFile(join(TRANSCRIPTS_DIR, f), "utf-8");
    const t = JSON.parse(raw) as Transcript;
    transcripts.push({ ...t, qtype: typeById.get(t.questionId) ?? "unknown" });
  }

  const total = transcripts.length;
  const correct = transcripts.filter((t) => t.isCorrect).length;
  const accuracy = correct / total;

  const byType = new Map<string, { total: number; correct: number }>();
  for (const t of transcripts) {
    const e = byType.get(t.qtype) ?? { total: 0, correct: 0 };
    e.total++;
    if (t.isCorrect) e.correct++;
    byType.set(t.qtype, e);
  }

  const precisions = transcripts
    .map((t) => t.retrieval?.precision)
    .filter((p): p is number => typeof p === "number");
  const recalls = transcripts
    .map((t) => t.retrieval?.recall)
    .filter((r): r is number => typeof r === "number");

  console.log(`\nLongMemEval — ${STRATEGY} strategy aggregate (${VARIANT})`);
  console.log(`────────────────────────────────────────────`);
  console.log(`Total:    ${total}`);
  console.log(`Correct:  ${correct}/${total}`);
  console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}%`);
  console.log();
  console.log(
    `Avg Precision: ${precisions.length ? ((precisions.reduce((a, b) => a + b, 0) / precisions.length) * 100).toFixed(1) : "n/a"}%`
  );
  console.log(
    `Avg Recall:    ${recalls.length ? ((recalls.reduce((a, b) => a + b, 0) / recalls.length) * 100).toFixed(1) : "n/a"}%`
  );
  console.log();
  console.log(`By Question Type:`);
  for (const [qt, st] of [...byType.entries()].sort()) {
    const acc = st.total ? (st.correct / st.total) * 100 : 0;
    console.log(`  ${qt.padEnd(28)} ${acc.toFixed(1).padStart(5)}%   ${st.correct}/${st.total}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
