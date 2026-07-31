import { defineConfig } from "vitest/config";

/**
 * Memory work-cost regression harness (`pnpm perf:memory`).
 *
 * Separate from `vitest.perf.config.mts` on purpose: that suite drives live LLM
 * slide generation, takes minutes per case, and asserts almost nothing — its
 * value is the printed telemetry. This one is the opposite. It is hermetic (no
 * network, no API key, no model download), deterministic, and it FAILS the build
 * when recall or retain starts doing more work than the committed baseline.
 *
 * It is also kept out of `vitest.config.mts` — the default suite runs on every
 * push and in the coverage job, and a whole-corpus benchmark does not belong on
 * that hot path. `.github/workflows/memory-perf.yml` runs it on PRs that touch
 * the memory read/write paths.
 *
 * TZ is pinned as belt-and-braces around the temporal recall lane, which
 * resolves relative phrases ("next week") against LOCAL midnight. The fixture is
 * already timezone-independent by construction — it places its event anchors
 * inside the window the parser itself resolves, with margin — and the counters
 * were verified identical from Kiritimati (UTC+14) through Niue (UTC-11) to
 * Tokyo (UTC+9) with this line commented out. It stays so that a future scenario
 * reaching for an absolute date inherits a fixed clock instead of the runner's.
 *
 * Note for anyone re-checking that: `TZ=Pacific/Niue pnpm perf:memory` proves
 * nothing, because the assignment below runs at config load and overwrites the
 * inherited value before any worker starts. The line has to be commented out for
 * the run to mean anything.
 */
process.env.TZ = "UTC";

export default defineConfig({
  test: {
    // happy-dom + globals mirrors the default unit suite, which is the
    // environment the in-memory LokiJS adapter is already exercised under.
    environment: "happy-dom",
    globals: true,
    include: ["test/memory/src/perf/**/*.test.ts"],
    // The counter table IS the deliverable for a human reading the log, and
    // vitest's default console interception only surfaces output from FAILING
    // tests — which would hide the report exactly when the gate is green.
    disableConsoleIntercept: true,
    // Seeding a ~1000-row corpus per write scenario plus a dozen whole-corpus
    // recalls: generous, but nowhere near the live-LLM suites' 15 minutes.
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
