import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      // More specific first — otherwise the bare "@anuma/sdk" alias would also
      // capture "@anuma/sdk/constants" and rewrite it to "<index.ts>/constants".
      "@anuma/sdk/constants": path.resolve(
        __dirname,
        "../../../src/constants/index.ts",
      ),
      "@anuma/sdk": path.resolve(__dirname, "../../../src/index.ts"),
    },
  },
  test: {
    globals: true,
    include: ["src/**/*.{test,spec}.ts"],
  },
});
