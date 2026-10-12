import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@anuma/sdk/server": path.resolve(__dirname, "../../../src/server/index.ts"),
      "@anuma/sdk/tools": path.resolve(__dirname, "../../../src/tools/index.ts"),
      "@anuma/sdk": path.resolve(__dirname, "../../../src/index.ts"),
    },
  },
  test: {
    globals: true,
    include: ["src/**/*.{test,spec}.ts", "test/**/*.{test,spec}.ts"],
  },
});
