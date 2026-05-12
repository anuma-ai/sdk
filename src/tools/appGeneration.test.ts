/**
 * Unit tests for pure helper functions exported from appGeneration.ts.
 * No LLM calls — these run fast and offline.
 */

import { describe, expect, it } from "vitest";

import {
  applyPatches,
  normalizePath,
  truncateContent,
  validateFileContent,
} from "./appGeneration.js";

// ---------------------------------------------------------------------------
// normalizePath
// ---------------------------------------------------------------------------

describe("normalizePath", () => {
  it("strips leading slashes", () => {
    expect(normalizePath("/App.js")).toBe("App.js");
    expect(normalizePath("///deep/file.ts")).toBe("deep/file.ts");
  });

  it("collapses double slashes", () => {
    expect(normalizePath("src//utils//index.ts")).toBe("src/utils/index.ts");
  });

  it("resolves parent traversals", () => {
    expect(normalizePath("src/lib/../utils/index.ts")).toBe("src/utils/index.ts");
  });

  it("removes dot segments", () => {
    expect(normalizePath("./src/./App.js")).toBe("src/App.js");
  });

  it("handles combined edge cases", () => {
    expect(normalizePath("///src/./lib/../utils//paths.ts")).toBe("src/utils/paths.ts");
  });

  it("returns empty string for root-only input", () => {
    expect(normalizePath("/")).toBe("");
  });

  it("passes through clean paths unchanged", () => {
    expect(normalizePath("src/components/App.js")).toBe("src/components/App.js");
  });
});

// ---------------------------------------------------------------------------
// truncateContent
// ---------------------------------------------------------------------------

describe("truncateContent", () => {
  it("returns short content unchanged", () => {
    const content = "hello world";
    expect(truncateContent(content)).toBe(content);
  });

  it("returns content at exactly the limit unchanged", () => {
    const content = "x".repeat(4000);
    expect(truncateContent(content)).toBe(content);
  });

  it("truncates long content keeping head and tail", () => {
    const content = "A".repeat(2000) + "B".repeat(2000) + "C".repeat(2000);
    const result = truncateContent(content);
    expect(result.length).toBeLessThan(content.length);
    expect(result).toContain("A");
    expect(result).toContain("C");
    expect(result).toMatch(/\d+ characters omitted/);
  });
});

// ---------------------------------------------------------------------------
// applyPatches
// ---------------------------------------------------------------------------

describe("applyPatches", () => {
  const base = "line one\nline two\nline three\n";

  it("applies a single patch", () => {
    const { content, applied, failed } = applyPatches(base, [
      { find: "line two", replace: "line TWO" },
    ]);
    expect(content).toBe("line one\nline TWO\nline three\n");
    expect(applied).toEqual(["line two"]);
    expect(failed).toEqual([]);
  });

  it("applies multiple patches in order", () => {
    const { content, applied, failed } = applyPatches(base, [
      { find: "line one", replace: "first" },
      { find: "line three", replace: "third" },
    ]);
    expect(content).toBe("first\nline two\nthird\n");
    expect(applied).toHaveLength(2);
    expect(failed).toHaveLength(0);
  });

  it("reports failed patches when find string is missing", () => {
    const { content, applied, failed } = applyPatches(base, [
      { find: "nonexistent", replace: "x" },
    ]);
    expect(content).toBe(base);
    expect(applied).toEqual([]);
    expect(failed).toEqual(["nonexistent"]);
  });

  it("skips patches with empty find strings", () => {
    const { content, failed } = applyPatches(base, [{ find: "", replace: "x" }]);
    expect(content).toBe(base);
    expect(failed).toEqual(["(empty find string)"]);
  });

  it("replaces only the first occurrence", () => {
    const repeated = "aaa bbb aaa";
    const { content } = applyPatches(repeated, [{ find: "aaa", replace: "ccc" }]);
    expect(content).toBe("ccc bbb aaa");
  });

  it("handles mixed success and failure", () => {
    const { applied, failed } = applyPatches(base, [
      { find: "line one", replace: "first" },
      { find: "missing", replace: "x" },
      { find: "line three", replace: "third" },
    ]);
    expect(applied).toHaveLength(2);
    expect(failed).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// validateFileContent
// ---------------------------------------------------------------------------

describe("validateFileContent", () => {
  it("returns null for syntactically valid JSX", () => {
    const src = `import React from 'react';\nexport default function App() { return <div>hi</div>; }\n`;
    expect(validateFileContent("App.jsx", src)).toBeNull();
  });

  it("returns null for valid TypeScript with type annotations", () => {
    const src = `export function add(a: number, b: number): number { return a + b; }\n`;
    expect(validateFileContent("util.ts", src)).toBeNull();
  });

  it("returns null for valid TSX", () => {
    const src = `type P = { name: string }\nexport const Hi = ({ name }: P) => <span>{name}</span>;\n`;
    expect(validateFileContent("Hi.tsx", src)).toBeNull();
  });

  it("flags broken JSX with line and column", () => {
    const src = `export default function App() {\n  return <div>;\n}\n`;
    const result = validateFileContent("App.jsx", src);
    expect(result).not.toBeNull();
    expect(result?.line).toBeGreaterThanOrEqual(2);
    expect(typeof result?.column).toBe("number");
    expect(result?.message).toBeTruthy();
  });

  it("flags an unclosed brace", () => {
    const src = `function f() {\n  if (true) {\n    return 1;\n  }\n`;
    const result = validateFileContent("f.js", src);
    expect(result).not.toBeNull();
    expect(typeof result?.line).toBe("number");
  });

  it("strips Babel's trailing (line:col) suffix from the message", () => {
    const src = `const x = ;\n`;
    const result = validateFileContent("bad.js", src);
    expect(result).not.toBeNull();
    expect(result?.message).not.toMatch(/\(\d+:\d+\)\s*$/);
  });

  it("returns null for valid JSON", () => {
    expect(validateFileContent("package.json", '{"name":"a","version":"1.0.0"}')).toBeNull();
  });

  it("flags broken JSON with line and column", () => {
    const src = '{\n  "name": "a",\n  "version":\n}\n';
    const result = validateFileContent("package.json", src);
    expect(result).not.toBeNull();
    expect(result?.line).toBeGreaterThanOrEqual(1);
    expect(typeof result?.column).toBe("number");
  });

  it("treats empty content as valid (lets the LLM scaffold incrementally)", () => {
    expect(validateFileContent("App.jsx", "")).toBeNull();
    expect(validateFileContent("config.json", "")).toBeNull();
  });

  it("skips validation for unknown extensions", () => {
    expect(validateFileContent("README.md", "this is not code")).toBeNull();
    expect(validateFileContent("styles.css", "broken { color }")).toBeNull();
    expect(validateFileContent("logo.svg", "<svg></p>")).toBeNull();
  });

  it("treats files without an extension as opaque", () => {
    expect(validateFileContent("Dockerfile", "FROM node\nINVALID")).toBeNull();
  });

  it("validates .mjs and .cjs as JavaScript", () => {
    expect(validateFileContent("a.mjs", "export const x = 1;\n")).toBeNull();
    expect(validateFileContent("a.cjs", "module.exports = { x: 1 };\n")).toBeNull();
    expect(validateFileContent("bad.mjs", "const x = ;\n")).not.toBeNull();
  });

  it("normalizes case in the extension lookup", () => {
    expect(validateFileContent("App.JSX", "<div />\n")).toBeNull();
    expect(validateFileContent("BAD.TS", "const x: = 1;\n")).not.toBeNull();
  });
});
