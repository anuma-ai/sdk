/**
 * Unit tests for pure helper functions exported from appGeneration.ts.
 * No LLM calls — these run fast and offline.
 */

import { describe, expect, it } from "vitest";

import {
  applyPatches,
  findBestAnchor,
  normalizePath,
  snippetAroundLine,
  snippetForFailedPatch,
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
    const { content, appliedCount, failed } = applyPatches(base, [
      { find: "line two", replace: "line TWO" },
    ]);
    expect(content).toBe("line one\nline TWO\nline three\n");
    expect(appliedCount).toBe(1);
    expect(failed).toEqual([]);
  });

  it("applies multiple patches in order", () => {
    const { content, appliedCount, failed } = applyPatches(base, [
      { find: "line one", replace: "first" },
      { find: "line three", replace: "third" },
    ]);
    expect(content).toBe("first\nline two\nthird\n");
    expect(appliedCount).toBe(2);
    expect(failed).toEqual([]);
  });

  it("reports failed patches with full find string and index", () => {
    const { content, appliedCount, failed } = applyPatches(base, [
      { find: "nonexistent string here", replace: "x" },
    ]);
    expect(content).toBe(base);
    expect(appliedCount).toBe(0);
    expect(failed).toEqual([
      { index: 0, find: "nonexistent string here", reason: "not_found" },
    ]);
  });

  it("reports patches with empty find strings", () => {
    const { content, failed } = applyPatches(base, [{ find: "", replace: "x" }]);
    expect(content).toBe(base);
    expect(failed).toEqual([{ index: 0, find: "", reason: "empty_find" }]);
  });

  it("replaces only the first occurrence", () => {
    const repeated = "aaa bbb aaa";
    const { content } = applyPatches(repeated, [{ find: "aaa", replace: "ccc" }]);
    expect(content).toBe("ccc bbb aaa");
  });

  it("reverts all changes when any patch fails (atomic)", () => {
    const { content, appliedCount, failed } = applyPatches(base, [
      { find: "line one", replace: "first" },
      { find: "missing", replace: "x" },
      { find: "line three", replace: "third" },
    ]);
    // Content stays at base — the two patches that would have matched
    // are NOT applied because one patch in the batch failed.
    expect(content).toBe(base);
    expect(appliedCount).toBe(0);
    expect(failed).toEqual([{ index: 1, find: "missing", reason: "not_found" }]);
  });

  it("tolerates JSON-double-escaped newlines in find", () => {
    // LLMs sometimes emit `\\n` (literal backslash+n) instead of a real
    // newline inside JSON string values. The fallback unescapes these
    // before declaring a failure.
    const { content, appliedCount, failed } = applyPatches(base, [
      { find: "line one\\nline two", replace: "ONE\nTWO" },
    ]);
    expect(content).toBe("ONE\nTWO\nline three\n");
    expect(appliedCount).toBe(1);
    expect(failed).toEqual([]);
  });

  it("tolerates JSON-double-escaped tabs and carriage returns in find", () => {
    const tabbed = "key:\tvalue\r\nnext line";
    const { content, appliedCount } = applyPatches(tabbed, [
      { find: "key:\\tvalue\\r\\nnext", replace: "KEY=value\nNEXT" },
    ]);
    expect(content).toBe("KEY=value\nNEXT line");
    expect(appliedCount).toBe(1);
  });

  it("strips leading line-number prefixes when the model copies read_file output verbatim", () => {
    // read_file returns "<n>: <text>". If the model includes those
    // prefixes in its find string, the stripped fallback should match.
    const { content, appliedCount, failed } = applyPatches(base, [
      { find: "1: line one\n2: line two", replace: "FIRST\nSECOND" },
    ]);
    expect(content).toBe("FIRST\nSECOND\nline three\n");
    expect(appliedCount).toBe(1);
    expect(failed).toEqual([]);
  });

  it("does not strip line-number prefixes when only some lines have them", () => {
    // Don't treat lines that happen to start with digits as numbered
    // output. The find must be ALL-numbered or none.
    const partiallyNumbered = "1: thing one\nactual content";
    const { content, appliedCount } = applyPatches("1: thing one\nactual content", [
      { find: partiallyNumbered, replace: "X" },
    ]);
    expect(content).toBe("X");
    expect(appliedCount).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// findBestAnchor
// ---------------------------------------------------------------------------

describe("findBestAnchor", () => {
  const file = [
    "function add(a, b) {",
    "  return a + b;",
    "}",
    "",
    "function multiply(a, b) {",
    "  return a * b;",
    "}",
    "",
    "export { add, multiply };",
  ].join("\n");

  it("finds the line containing a longer fragment of find", () => {
    const find = "function multiply(a, b) {\n  return a + b; // wrong\n}";
    expect(findBestAnchor(file, find)).toEqual({ line: 5, confidence: "high" });
  });

  it("returns null when no non-trivial line in find appears in content", () => {
    const find = "function totallyDifferent(x) {\n  return doSomething(x);\n}";
    expect(findBestAnchor(file, find)).toBeNull();
  });

  it("returns null when every line in find is too short to anchor on", () => {
    expect(findBestAnchor(file, "}\n)")).toBeNull();
  });

  it("prefers the longest matching line when multiple candidates exist", () => {
    const find = "function add(a, b) {\n  return WRONG;\n}";
    expect(findBestAnchor(file, find)).toEqual({ line: 1, confidence: "high" });
  });

  it("prefers a semantic line over a longer SVG markup line", () => {
    // Common React component shape: a long icon SVG at the top, a
    // semantic button handler further down. A failed find that contains
    // both should anchor on the handler, NOT the icon — otherwise the
    // returned snippet describes the wrong region of the file.
    const reactFile = [
      'function App() {',
      '  return (',
      '    <div>',
      '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>',
      '      <button onClick={handleSubmit}>Save</button>',
      '    </div>',
      '  );',
      '}',
    ].join("\n");
    const find = [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">',
      "  <path d=\"M12 5l7 7-7 7\" />",
      "</svg>",
      "<button onClick={handleSubmit}>",
    ].join("\n");
    expect(findBestAnchor(reactFile, find)).toEqual({ line: 5, confidence: "high" });
  });

  it("marks SVG-only matches as low confidence", () => {
    // When the only line from `find` that anchors is a generic SVG tag,
    // the match is structurally suspect — the model probably hallucinated
    // the rest of the patch. Surface that via the low-confidence flag.
    const reactFile = [
      'function App() {',
      '  return <svg viewBox="0 0 24 24" fill="none"><path d="M5 13" /></svg>;',
      '}',
    ].join("\n");
    const find = '<svg viewBox="0 0 24 24" fill="none">\n<path d="M99 99" />';
    expect(findBestAnchor(reactFile, find)).toEqual({ line: 2, confidence: "low" });
  });
});

// ---------------------------------------------------------------------------
// snippetAroundLine
// ---------------------------------------------------------------------------

describe("snippetAroundLine", () => {
  const file = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join("\n");

  it("returns numbered lines around the anchor", () => {
    const snip = snippetAroundLine(file, 10, 2, 2);
    expect(snip.startLine).toBe(8);
    expect(snip.endLine).toBe(12);
    expect(snip.content).toBe(["8: line 8", "9: line 9", "10: line 10", "11: line 11", "12: line 12"].join("\n"));
  });

  it("clamps to file start", () => {
    const snip = snippetAroundLine(file, 1, 5, 2);
    expect(snip.startLine).toBe(1);
    expect(snip.endLine).toBe(3);
  });

  it("clamps to file end", () => {
    const snip = snippetAroundLine(file, 20, 2, 10);
    expect(snip.startLine).toBe(18);
    expect(snip.endLine).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// snippetForFailedPatch
// ---------------------------------------------------------------------------

describe("snippetForFailedPatch", () => {
  const file = [
    "import React from 'react';",
    "",
    "function App() {",
    "  const [count, setCount] = useState(0);",
    "  return <button onClick={() => setCount(count + 1)}>{count}</button>;",
    "}",
    "",
    "export default App;",
  ].join("\n");

  it("returns context around the anchor when a high-confidence match is found", () => {
    const find = "const [count, setCount] = useState(0);\nreturn <DIFFERENT />;";
    const snip = snippetForFailedPatch(file, find);
    expect(snip).not.toBeNull();
    expect(snip!.content).toContain("4: ");
    expect(snip!.content).toContain("const [count, setCount] = useState(0);");
  });

  it("returns null when no anchor matches at all", () => {
    const find = "completely unrelated content here\nthat does not match anything";
    expect(snippetForFailedPatch(file, find)).toBeNull();
  });

  it("returns null when only a noisy SVG markup line anchors (low confidence)", () => {
    const svgFile = [
      "function App() {",
      '  return <svg viewBox="0 0 24 24" fill="none"><path d="M5 13" /></svg>;',
      "}",
    ].join("\n");
    const find = '<svg viewBox="0 0 24 24" fill="none">\n<button onClick={hallucinated}>';
    expect(snippetForFailedPatch(svgFile, find)).toBeNull();
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
