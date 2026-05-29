import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Vite's alias substitution is prefix-based, so the bare `@anuma/sdk`
    // entry would shadow the subpath imports (`@anuma/sdk/server`,
    // `@anuma/sdk/tools`) — list the subpaths explicitly so each resolves
    // to its own source entrypoint, no `pnpm build` required.
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
