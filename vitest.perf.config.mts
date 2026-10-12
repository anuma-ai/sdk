import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      "test/tools/requestProbe.ts",
      "test/tools/slide-generation/*Probe.test.ts",
      "test/tools/slide-generation/deckEditingTimings.test.ts",
    ],
    testTimeout: 900_000,
    hookTimeout: 120_000,
    maxConcurrency: 2,
  },
});
