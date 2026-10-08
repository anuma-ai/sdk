import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/tools/*.ts", "test/tools/**/*.test.ts", "test/classifier/*.ts"],
    exclude: [
      "test/tools/setup.ts",
      "test/tools/index.ts",
      "test/tools/googleAuth.ts",
      "test/tools/recorder.ts",
      "test/tools/**/setup.ts",
      "test/tools/**/tools.ts",
      "test/tools/slide-generation/dumpFiles.test.ts",
      "test/tools/requestProbe.ts",
      "test/tools/slide-generation/requestProbe.test.ts",
      "test/tools/slide-generation/editProbe.test.ts",
      "test/tools/slide-generation/deckEditingTimings.test.ts",
    ],
    testTimeout: 300_000,
    retry: 1,
    hookTimeout: 120_000,
    maxConcurrency: 6,
    maxWorkers: 8,
  },
});
