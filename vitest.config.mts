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
    ],
    // Browser tests need Playwright's Chromium binary and ~3-5s per case.
    // Skipped by default so `vitest run` stays fast; run via
    // `pnpm test:browser` (which uses vitest.browser.config.mts).
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.browser.test.ts"],
  },
});
