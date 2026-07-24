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
  // Constants — dependency-free, side-effect-free primitive constants.
  // RN/Hermes-safe leaf bundle so slim consumers (agent packages, other
  // cross-platform packages) can import values without the bare SDK bundle.
  // Exposed as "@anuma/sdk/constants" with a "react-native" export condition.
  {
    entry: ["src/constants/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/constants",
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
  // Reference Transformers.js NER detector — opt-in, exposed as
  // "@anuma/sdk/pii/transformers". `@huggingface/transformers` is an optional
  // peer dep (auto-externalized; kept explicit) so it never enters the bundle.
  {
    entry: ["src/lib/pii/detectors/transformers.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/pii",
    external: ["@huggingface/transformers"],
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
  // Tool-selection engine + resolver — the node/RN/RSC-safe orchestration layer
  // exposed as "@anuma/sdk/tools/selection" (issue #702). Its own entry with
  // isolated externals — the "tools/" prefix is a naming grouping, NOT part of
  // the "@anuma/sdk/tools" factory bundle. Deliberately free of WatermelonDB and
  // recharts (the embedding calls come from the db-free memoryEngine/generate
  // core), so both externals are belt-and-suspenders. The ../client rewrite
  // mirrors server/react/expo so the generated HTTP client is not re-bundled.
  {
    entry: ["src/tools/selection/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/tools/selection",
    external: ["react", "recharts", "@nozbe/watermelondb"],
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
  },
]);
