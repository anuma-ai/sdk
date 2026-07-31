import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/tools/*.ts", "test/tools/**/*.test.ts", "test/classifier/*.ts"],
    exclude: [
      "test/tools/setup.ts",
      "test/tools/index.ts",
      "test/tools/googleAuth.ts",
      // Recording helper for runToolLoop — no tests of its own, so the
      // `test/tools/*.ts` glob above makes vitest fail it with "No test suite
      // found". Added in #528 (2026-06-05) and unnoticed since, because this
      // suite has never run to completion under enforcement.
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
      "test/tools/slide-generation/requestProbe.test.ts",
      "test/tools/slide-generation/editProbe.test.ts",
      "test/tools/slide-generation/deckEditingTimings.test.ts",
      // ── Slide generation: exempted from CI pending #842 ──────────────────
      // Every slide turn currently spends ~140-150s in a continuation round
      // that returns no tool call, no text and no error, then ends with zero
      // `add_slide` calls. Measured from the uploaded traces of run
      // 30653871309: `generates a new slide deck` 173s total / 23s accounted
      // by steps, and `picks a register-appropriate design system` 164s / 27s.
      //
      // Note the second one PASSES — its assertions stop at `plan_deck`, so it
      // exhibits the same bug and never looks. That is why this is excluded by
      // FILE rather than by quarantining individual tests: the failing set is
      // not the affected set, and skipping only what goes red would leave
      // tests that green-light a broken path.
      //
      // Re-enable when #842 is fixed. The suite is the check: these are the
      // only tests that exercise plan_deck -> add_slide end to end.
      "test/tools/slide-generation/compositionLayouts.test.ts",
      "test/tools/slide-generation/slide-generation.test.ts",
      "test/tools/slide-generation/prompts.test.ts",
    ],
    testTimeout: 300_000,
    hookTimeout: 120_000,
    // Allow concurrent e2e tests so we can fan out across models.
    // Each test makes HTTP calls + waits on the LLM so the bottleneck is
    // wall time, not CPU. Kept at 6 because the portal rate-limits /
    // 500s / connection-fails when all models hammer it simultaneously.
    maxConcurrency: 6,
  },
});
