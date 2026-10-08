import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/lib/memory/context.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/memory",
    outExtension({ format }) {
      return { js: format === "esm" ? ".mjs" : ".cjs" };
    },
  },
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
      "exceljs",
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
  {
    entry: ["src/telemetry/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/telemetry",
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
  {
    entry: ["src/server/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    outDir: "dist/server",
    external: [
      "@huggingface/transformers",
      "pdfjs-dist",
      "exceljs",
      "mammoth",
      "jszip",
      "jspdf",
      "marked",
    ],
    noExternal: ["@nozbe/watermelondb"],
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".mjs" : ".cjs",
      };
    },
  },
]);
