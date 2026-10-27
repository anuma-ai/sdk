import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/tools/requestProbe.ts"],
    testTimeout: 900_000,
    hookTimeout: 120_000,
    maxConcurrency: 2,
  },
});
