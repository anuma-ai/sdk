import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/tools/*.ts"],
    exclude: ["test/tools/setup.ts", "test/tools/index.ts"],
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
