import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/client/index.ts", "src/vercel/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".cjs",
    };
  },
});
