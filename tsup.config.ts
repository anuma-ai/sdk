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
  // Use this for Expo/React Native: import { useChat } from "@anuma/sdk/expo"
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
            return { path: "@anuma/sdk", external: true };
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
    external: [
      "react",
      "@privy-io/react-auth",
      "@huggingface/transformers",
      "recharts",
      // Processor heavy deps — only loaded dynamically when processing files
      "exceljs",
      // PDF export — lazy-loaded when consumers call exportElementToPdf/exportMarkdownToPdf
      "jspdf",
      "html2canvas",
      "marked",
    ],
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
            return { path: "@anuma/sdk", external: true };
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
  {
    entry: ["src/client/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/client",
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
  {
    entry: ["src/tools/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/tools",
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
  // Design — pointer-driven gesture system for AnumaNode trees.
  // The foundation for any visual editor on the SDK runtime
  // (slide editor, app-mockup designer, etc.). React-only; same
  // external pattern as src/react.
  {
    entry: ["src/design/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/design",
    external: ["react"],
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
  // OpenAPI spec — re-exported so clients can import it from the SDK
  {
    entry: ["src/api/spec.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/api",
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
  // Utils — build-time utilities (doc generation, etc.)
  {
    entry: ["src/utils/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/utils",
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
  // Server entry - no React, no browser APIs
  // Use this for Node.js servers: import { ... } from "@anuma/sdk/server"
  {
    entry: ["src/server/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/server",
    external: [
      "@huggingface/transformers",
      // Processor heavy deps — only loaded when consumers use file processors
      "pdfjs-dist",
      "exceljs",
      "mammoth",
      "jszip",
      // PDF export — lazy-loaded
      "jspdf",
      "marked",
    ],
    // watermelondb is a peerDep (auto-externalized by tsup) but is CJS-only
    // with no ESM exports — must be bundled to avoid ERR_UNSUPPORTED_DIR_IMPORT
    noExternal: ["@nozbe/watermelondb"],
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
            return { path: "@anuma/sdk", external: true };
          });
        },
      },
    ],
  },
]);
