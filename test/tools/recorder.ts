/**
 * JSONL recorder for e2e tool tests.
 *
 * Writes one record per `runToolLoop` invocation to
 *   test/tools/.runs/<ISO>-<model>-<pid>.jsonl
 *
 * Each record captures: test name, model, apiType, total + per-step latency,
 * tool calls + arguments, tool results, per-step token usage, final assistant
 * text, and error. Used to analyze tool-selection accuracy, arg quality,
 * retry behavior, and token cost across models / commits.
 *
 * Writes are serialized through a promise chain so concurrent tests
 * (vitest maxConcurrency=6) don't interleave lines.
 */

import * as fs from "node:fs";
import * as path from "node:path";

const RUNS_DIR = path.join(__dirname, ".runs");

function sanitize(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
}

let filePath: string | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function ensureFile(model: string): string {
  if (filePath) return filePath;
  fs.mkdirSync(RUNS_DIR, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  filePath = path.join(RUNS_DIR, `${ts}-${sanitize(model)}-${process.pid}.jsonl`);
  console.log(`[e2e] recording to ${path.relative(process.cwd(), filePath)}`);
  return filePath;
}

export type RecordedStep = {
  stepIndex: number;
  content: string;
  toolCalls: Array<{ name: string; arguments: string }>;
  toolResults: Array<{
    name: string;
    result: unknown;
    error?: string;
    errorType?: string;
  }>;
  usage: { inputTokens?: number; outputTokens?: number };
  latencyMs: number;
};

export type RunRecord = {
  ts: string;
  test: string;
  model: string;
  apiType: string;
  toolsRegistered: string[];
  latencyMs: number;
  steps: RecordedStep[];
  finalText: string;
  error: string | null;
};

function serialize(entry: RunRecord): string {
  try {
    return JSON.stringify(entry) + "\n";
  } catch {
    return (
      JSON.stringify({
        ...entry,
        steps: `[unserializable: ${entry.steps.length} steps]`,
      }) + "\n"
    );
  }
}

export function record(entry: RunRecord): Promise<void> {
  const fp = ensureFile(entry.model);
  const line = serialize(entry);
  writeQueue = writeQueue
    .then(() => fs.promises.appendFile(fp, line))
    .catch((err) => {
      console.warn(`[e2e] recorder write failed: ${err}`);
    });
  return writeQueue;
}

export function recorderFilePath(): string | null {
  return filePath;
}
