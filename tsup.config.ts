import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/client/index.ts", "src/client/@tanstack/react-query.gen.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  outExtension({ format }) {
    return {
      js: format === "esm" ? ".mjs" : ".cjs",
    };
  },
});
