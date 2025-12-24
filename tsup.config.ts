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
    entry: ["src/lib/polyfills/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/polyfills",
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
  // Expo/React Native entry - lightweight, no pdfjs-dist
  // Use this for Expo/React Native: import { useChat } from "@reverbia/sdk/expo"
  {
    entry: ["src/expo/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/expo",
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
    entry: ["src/react/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/react",
    external: ["react", "@privy-io/react-auth"],
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
  {
    entry: ["src/next/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/next",
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
]);
