import { defineConfig } from "vitest/config";

/**
 * Performance / measurement-probe suite. These tests print per-round
 * payload sizes, wall-clock breakdowns, and other telemetry that's
 * only useful when someone is actively investigating slide-generation
 * latency. They run a real LLM round-trip each (~70-250s apiece) so
 * they're excluded from the default e2e CI run; invoke them
 * explicitly via `pnpm perf:slides` when you need the numbers.
 *
 * Assertions are intentionally weak ("the run completed") — the
 * value is in the console output, not in pass/fail.
 */
export default defineConfig({
  test: {
    include: ["test/tools/slide-generation/*Probe.test.ts"],
    testTimeout: 600_000,
    hookTimeout: 120_000,
    maxConcurrency: 2,
  },
});
