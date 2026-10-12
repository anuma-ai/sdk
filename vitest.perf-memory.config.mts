import { defineConfig } from "vitest/config";

process.env.TZ = "UTC";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: ["test/memory/src/perf/**/*.test.ts"],
    disableConsoleIntercept: true,
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
