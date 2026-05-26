import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.browser.test.ts"],
    testTimeout: 30_000,
  },
});
