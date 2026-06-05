/**
 * Machine-readable metrics for app-generation benchmark runs.
 *
 * The benchmarks under `test/tools/app-generation/` exercise the
 * `createAppGenerationTools` flow end-to-end and historically logged
 * tool counts, file sizes, and elapsed time to stdout only. That's fine
 * for a single run but useless for "did the prompt change regress
 * anything?" — comparing two runs meant eyeballing two terminal logs.
 *
 * This module exposes pure helpers to turn a benchmark's per-phase
 * tool log + final file store into a stable `RunRecord` that can be
 * serialised to JSON, persisted alongside the generated app, and
 * diffed against a prior run. Disk I/O lives in the e2e setup; this
 * module stays pure so the formatting and totals are unit-testable
 * without touching the filesystem.
 *
 * Schema versioning: bumped via `SCHEMA_VERSION`. Old runs in
 * `.output/{bench}/.history/` may carry older versions; the compare
 * helpers tolerate same-version comparisons only.
 */

export const SCHEMA_VERSION = 1 as const;

/** Subset of a benchmark's tool-call log used by metrics. The full
 *  `ToolCallLog` in `test/tools/setup.ts` carries `args` too but
 *  metrics only need name + result for now. */
export interface ToolCallRecord {
  name: string;
  result: unknown;
}

/** Per-phase counters from a benchmark run. A "phase" is whatever the
 *  benchmark defines as a unit — usually one user message + the model's
 *  response. */
export interface PhaseRecord {
  label: string;
  elapsedMs: number;
  /** Tool call counts keyed by tool name (create_file, patch_file, …). */
  toolCalls: Record<string, number>;
  /** Number of patch_file calls that reported `failed > 0`. */
  failedPatches: number;
  /** Number of files overwritten via create_file (existed in storage
   *  before the call). High and rising overwrite counts mean the model
   *  is rewriting where patch_file would have been smaller — the
   *  read-before-write contract permits this but doesn't measure it. */
  overwrites: number;
  /** File-store snapshot after the phase, keyed by path → byte length. */
  files: Record<string, number>;
  /** Whether the model errored out of the tool loop in this phase. */
  errored: boolean;
}

/** Final, persisted record for a benchmark run. */
export interface RunRecord {
  schemaVersion: number;
  /** Top-level benchmark identifier, e.g. "kanban". */
  benchmark: string;
  /** Optional scenario when one benchmark file has multiple `it` blocks. */
  scenario?: string;
  model: string;
  apiType: string;
  /** Short hash of the system prompt in effect for the run. Lets
   *  comparisons attribute regressions to prompt changes. */
  promptHash: string;
  startedAt: string;
  finishedAt: string;
  totalElapsedMs: number;
  phases: PhaseRecord[];
  totals: {
    toolCalls: Record<string, number>;
    failedPatches: number;
    overwrites: number;
  };
}

/**
 * Reduce a slice of tool calls + the resulting file store to a single
 * `PhaseRecord`. Pure.
 */
export function summarizePhase(opts: {
  label: string;
  elapsedMs: number;
  toolCalls: ToolCallRecord[];
  files: ReadonlyMap<string, string> | Record<string, string>;
  errored?: boolean;
}): PhaseRecord {
  const counts: Record<string, number> = {};
  for (const c of opts.toolCalls) {
    counts[c.name] = (counts[c.name] ?? 0) + 1;
  }

  const failedPatches = opts.toolCalls.filter((c) => {
    if (c.name !== "patch_file") return false;
    try {
      const r: unknown = typeof c.result === "string" ? JSON.parse(c.result) : c.result;
      const failed = (r as { failed?: number } | null)?.failed;
      return typeof failed === "number" && failed > 0;
    } catch {
      return false;
    }
  }).length;

  // Sum `overwritten[].length` across all create_file successes. Each
  // call's result carries the per-call subset of paths that already
  // existed — overwrites are a soft signal that the model could have
  // used patch_file for a smaller, more reviewable diff.
  let overwrites = 0;
  for (const c of opts.toolCalls) {
    if (c.name !== "create_file") continue;
    try {
      const r: unknown = typeof c.result === "string" ? JSON.parse(c.result) : c.result;
      const arr = (r as { overwritten?: unknown } | null)?.overwritten;
      if (Array.isArray(arr)) overwrites += arr.length;
    } catch {
      // Malformed result — leave count alone.
    }
  }

  const files: Record<string, number> = {};
  const fileEntries: Iterable<[string, string]> =
    opts.files instanceof Map ? opts.files : Object.entries(opts.files);
  for (const [p, c] of fileEntries) files[p] = c.length;

  return {
    label: opts.label,
    elapsedMs: opts.elapsedMs,
    toolCalls: counts,
    failedPatches,
    overwrites,
    files,
    errored: opts.errored ?? false,
  };
}

/** Combine per-phase records into the final, persistable `RunRecord`. */
export function finalizeRun(opts: {
  benchmark: string;
  scenario?: string;
  model: string;
  apiType: string;
  promptHash: string;
  startedAt: string;
  phases: PhaseRecord[];
}): RunRecord {
  const totals = {
    toolCalls: {} as Record<string, number>,
    failedPatches: 0,
    overwrites: 0,
  };
  let totalElapsedMs = 0;
  for (const p of opts.phases) {
    totalElapsedMs += p.elapsedMs;
    totals.failedPatches += p.failedPatches;
    totals.overwrites += p.overwrites;
    for (const [name, count] of Object.entries(p.toolCalls)) {
      totals.toolCalls[name] = (totals.toolCalls[name] ?? 0) + count;
    }
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    benchmark: opts.benchmark,
    scenario: opts.scenario,
    model: opts.model,
    apiType: opts.apiType,
    promptHash: opts.promptHash,
    startedAt: opts.startedAt,
    finishedAt: new Date().toISOString(),
    totalElapsedMs,
    phases: opts.phases,
    totals,
  };
}

/** Stable 12-char hash of a string for `promptHash` and similar
 *  attribution fields. Non-cryptographic — just enough to detect
 *  prompt drift between runs. */
export function shortHash(s: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < s.length; i++) {
    h1 ^= s.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= s.charCodeAt(s.length - 1 - i);
    h2 = Math.imul(h2, 0x85ebca6b);
  }
  return (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).slice(0, 4);
}

function formatDelta(before: number, after: number, unit: string = ""): string {
  const diff = after - before;
  const sign = diff > 0 ? "+" : "";
  return `${before}${unit} → ${after}${unit}  (${sign}${diff}${unit})`;
}

/**
 * Render a human-readable side-by-side diff between two runs. Used by
 * the `scripts/compare-app-gen-runs.ts` CLI and by tests that want to
 * sanity-check a regression in CI.
 *
 * Order matters: `before` is the baseline, `after` is the candidate.
 * Positive deltas mean the candidate did more (more tool calls, larger
 * files, longer elapsed); negative deltas mean less.
 */
export function compareRuns(before: RunRecord, after: RunRecord): string {
  if (before.schemaVersion !== after.schemaVersion) {
    return `cannot compare: schema mismatch (${before.schemaVersion} vs ${after.schemaVersion})`;
  }
  const lines: string[] = [];
  const scenarioSuffix = after.scenario ? `/${after.scenario}` : "";
  lines.push(`# compare ${after.benchmark}${scenarioSuffix}`);
  lines.push(`  before: ${before.startedAt}  model=${before.model}  prompt=${before.promptHash}`);
  lines.push(`  after:  ${after.startedAt}  model=${after.model}  prompt=${after.promptHash}`);
  if (before.model !== after.model) {
    lines.push(`  ⚠ model differs — deltas mix model+prompt effects`);
  }
  if (before.promptHash !== after.promptHash) {
    lines.push(`  ⚠ prompt differs — deltas attributable to prompt change`);
  }
  lines.push("");

  lines.push(`elapsed: ${formatDelta(before.totalElapsedMs, after.totalElapsedMs, "ms")}`);
  lines.push("");

  lines.push("tool calls (totals):");
  const allTools = new Set([
    ...Object.keys(before.totals.toolCalls),
    ...Object.keys(after.totals.toolCalls),
  ]);
  for (const name of [...allTools].sort()) {
    const b = before.totals.toolCalls[name] ?? 0;
    const a = after.totals.toolCalls[name] ?? 0;
    lines.push(`  ${name.padEnd(18)} ${formatDelta(b, a)}`);
  }
  lines.push(
    `  ${"failedPatches".padEnd(18)} ${formatDelta(before.totals.failedPatches, after.totals.failedPatches)}`
  );
  lines.push(
    `  ${"overwrites".padEnd(18)} ${formatDelta(before.totals.overwrites, after.totals.overwrites)}`
  );
  lines.push("");

  lines.push("per-phase:");
  const phasesB = new Map(before.phases.map((p) => [p.label, p]));
  const phasesA = new Map(after.phases.map((p) => [p.label, p]));
  const allPhases = new Set([...phasesB.keys(), ...phasesA.keys()]);
  for (const label of [...allPhases]) {
    const bp = phasesB.get(label);
    const ap = phasesA.get(label);
    if (!bp) {
      lines.push(`  ${label}: + added`);
      continue;
    }
    if (!ap) {
      lines.push(`  ${label}: - removed`);
      continue;
    }
    lines.push(`  ${label}:`);
    lines.push(`    elapsed:       ${formatDelta(bp.elapsedMs, ap.elapsedMs, "ms")}`);
    lines.push(`    failedPatches: ${formatDelta(bp.failedPatches, ap.failedPatches)}`);
    lines.push(`    overwrites:    ${formatDelta(bp.overwrites, ap.overwrites)}`);
    const allFiles = new Set([...Object.keys(bp.files), ...Object.keys(ap.files)]);
    for (const f of [...allFiles].sort()) {
      const bsize = bp.files[f] ?? 0;
      const asize = ap.files[f] ?? 0;
      if (bsize === asize) continue;
      lines.push(`    ${f.padEnd(20)} ${formatDelta(bsize, asize, "ch")}`);
    }
  }

  return lines.join("\n");
}
