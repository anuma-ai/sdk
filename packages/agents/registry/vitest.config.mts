import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@anuma/sdk": path.resolve(__dirname, "../../../src/index.ts"),
      "@anuma/agent-haven": path.resolve(__dirname, "../haven/src/index.ts"),
      "@anuma/agent-sentinel": path.resolve(__dirname, "../sentinel/src/index.ts"),
    },
  },
  test: {
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
  },
});
