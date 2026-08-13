import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      // dumpFiles is test infrastructure (lives under test/) but doesn't
      // need PORTAL_API_KEY — include it in the fast unit suite so it
      // runs on every change instead of only with the heavy e2e suite.
      "test/tools/slide-generation/dumpFiles.test.ts",
      // Pure, deterministic bootstrap-significance helpers for the memory
      // eval harness — no PORTAL_API_KEY needed, so run in the fast unit suite.
      "test/memory/src/metrics.test.ts",
      // Frozen-embedding cache glue (load/save/invalidation) — embeddings are
      // mocked, so no PORTAL_API_KEY needed; runs in the fast unit suite.
      "test/memory/src/vault/embeddingCache.test.ts",
      // --compare pairing core (the skip branches) — pure, no PORTAL_API_KEY.
      "test/memory/src/vault/comparison.test.ts",
      // Extraction regression-gate math (baseline build + compare) — pure,
      // no PORTAL_API_KEY; the live eval that feeds it runs only in CI.
      "test/memory/src/extraction/baseline.unit.test.ts",
      // Shared regression-gate math for the topic / consolidation / recall
      // gates — pure, same deal: the live evals that feed it run only in CI.
      "test/memory/src/gate.test.ts",
      // LongMemEval scoring failure semantics — fetch is stubbed, so no
      // PORTAL_API_KEY. This is the gate that keeps a broken judge, or an
      // answer call that produced nothing, from being scored as "every answer
      // is wrong" again; that silence is what made a healthy run read 0.0%
      // accuracy beside 95% retrieval.
      "test/memory/src/longmemeval/judge.test.ts",
      // Run-level aggregation: the rule that a harness crash contributes to
      // counts but never to an average. Pure arithmetic, no PORTAL_API_KEY.
      // This is what keeps a few infrastructure crashes from firing the recall
      // gate as a ranking regression.
      "test/memory/src/longmemeval/aggregate.test.ts",
      // The SDK-extractor mapping (#907): ExtractedCandidate → ExtractedMemory.
      // Pure, no PORTAL_API_KEY. Every field is a narrowing, so a wrong branch
      // yields a plausible memory with the wrong temporal anchor — it moves the
      // temporal category's score without failing anything.
      "test/memory/src/longmemeval/extractor.test.ts",
    ],
    // Browser tests need Playwright's Chromium binary and ~3-5s per case.
    // Skipped by default so `vitest run` stays fast; run via
    // `pnpm test:browser` (which uses vitest.browser.config.mts).
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.browser.test.ts"],
  },
});
