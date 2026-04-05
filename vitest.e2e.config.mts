import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/tools/*.ts", "test/tools/**/*.test.ts"],
    exclude: ["test/tools/setup.ts", "test/tools/index.ts", "test/tools/googleAuth.ts", "test/tools/**/setup.ts", "test/tools/**/tools.ts"],
    testTimeout: 300_000,
    hookTimeout: 120_000,
  },
});
