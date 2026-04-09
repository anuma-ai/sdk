import { defineConfig } from "vitest/config";

const baseExclude = [
  "test/tools/setup.ts",
  "test/tools/index.ts",
  "test/tools/googleAuth.ts",
  "test/tools/**/setup.ts",
  "test/tools/**/tools.ts",
];

export default defineConfig({
  test: {
    include: ["test/tools/*.ts", "test/tools/**/*.test.ts"],
    exclude: process.env.COMPARISON
      ? baseExclude
      : [...baseExclude, "test/tools/*.comparison.ts"],
    testTimeout: 600_000,
    hookTimeout: 300_000,
  },
});
