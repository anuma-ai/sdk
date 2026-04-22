import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/tools/*.ts", "test/tools/**/*.test.ts"],
    exclude: [
      "test/tools/setup.ts",
      "test/tools/index.ts",
      "test/tools/googleAuth.ts",
      "test/tools/**/setup.ts",
      "test/tools/**/tools.ts",
    ],
    testTimeout: 300_000,
    hookTimeout: 120_000,
    // Cap file-level parallelism. Portal API rate-limits / 500s /
    // connection-fails when many test files stream LLM requests at once.
    poolOptions: {
      threads: {
        maxThreads: 2,
        minThreads: 1,
      },
    },
    // Allow concurrent e2e tests so we can fan out across models.
    // Each test makes HTTP calls + waits on the LLM so the bottleneck is
    // wall time, not CPU. Kept at 6 because the portal rate-limits /
    // 500s / connection-fails when all models hammer it simultaneously.
    maxConcurrency: 6,
  },
});
