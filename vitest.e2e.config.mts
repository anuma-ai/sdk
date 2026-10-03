import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/tools/*.ts", "test/tools/**/*.test.ts", "test/classifier/*.ts"],
    exclude: [
      "test/tools/setup.ts",
      "test/tools/index.ts",
      "test/tools/googleAuth.ts",
      // JSONL trace writer used by setup.ts, not a test. Matching it made vitest
      // report "No test suite found" and fail the run on every execution.
      "test/tools/recorder.ts",
      "test/tools/**/setup.ts",
      "test/tools/**/tools.ts",
      // Pure unit test for dumpFiles — runs under the main vitest config.
      "test/tools/slide-generation/dumpFiles.test.ts",
      // Probe / timing tests are measurement / analysis tools, not
      // regression checks — their assertions are weak ("the run
      // completed") and they burn LLM time printing per-round telemetry
      // that's only useful when someone is actively investigating
      // perf. Run them via `pnpm perf:slides` (vitest.perf.config.mts)
      // when you need the numbers; otherwise skip.
      "test/tools/requestProbe.ts",
      "test/tools/slide-generation/requestProbe.test.ts",
      "test/tools/slide-generation/editProbe.test.ts",
      "test/tools/slide-generation/deckEditingTimings.test.ts",
    ],
    testTimeout: 300_000,
    // One retry for live-model and live-portal noise. The SDK deliberately does
    // not retry a stream that drops after output has started, and the portal
    // does drop them: an undici "terminated" 27s into a slide round failed run
    // 36168690288. A test that fails twice in a row still fails the run.
    retry: 1,
    hookTimeout: 120_000,
    // Allow concurrent e2e tests so we can fan out across models.
    // Each test makes HTTP calls + waits on the LLM so the bottleneck is
    // wall time, not CPU. Kept at 6 because the portal rate-limits /
    // 500s / connection-fails when all models hammer it simultaneously.
    // The app- and slide-generation suites use `describe.concurrent`: each of
    // their tests is one to five minutes of model time, and run one after
    // another a single file took longer than the whole CI budget.
    maxConcurrency: 6,
    // Files are network-bound, so run more of them than the runner has cores.
    // At the default (cores - 1 = 3 on ubuntu-latest) the six-minute slide
    // prompts file sat queued for four minutes behind the other long files.
    maxWorkers: 8,
  },
});
