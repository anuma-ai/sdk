import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "test/tools/slide-generation/dumpFiles.test.ts",
      "test/memory/src/metrics.test.ts",
      "test/memory/src/vault/embeddingCache.test.ts",
      "test/memory/src/vault/comparison.test.ts",
      "test/memory/src/extraction/baseline.unit.test.ts",
      "test/memory/src/gate.test.ts",
      "test/memory/src/longmemeval/judge.test.ts",
      "test/memory/src/longmemeval/aggregate.test.ts",
      "test/memory/src/longmemeval/extractor.test.ts",
    ],
    exclude: ["**/node_modules/**", "**/dist/**", "**/*.browser.test.ts"],
  },
});
