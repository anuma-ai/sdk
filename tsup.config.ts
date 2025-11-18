import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist",
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
  {
    entry: ["src/react/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/react",
    external: ["react"],
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
    esbuildPlugins: [
      {
        name: "rewrite-client-import",
        setup(build) {
          build.onResolve({ filter: /^\.\.\/client$/ }, () => {
            return { path: "@reverbia/sdk", external: true };
          });
        },
      },
    ],
  },
  {
    entry: ["src/vercel/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/vercel",
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
]);
