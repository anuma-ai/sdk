/**
 * Unit tests for pure helper functions exported from appGeneration.ts.
 * No LLM calls — these run fast and offline.
 */

import { describe, expect, it } from "vitest";

import type { ToolConfig } from "../lib/chat/useChat/types.js";

import {
  type AppFileRecord,
  type AppFileStorage,
  applyPatches,
  createAppGenerationTools,
  DEFAULT_DESIGN_CRITIQUE_RUBRIC,
  type FileChangeEvent,
  findBestAnchor,
  MapFileStorage,
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
    expect(failed).toEqual([{ index: 0, find: "nonexistent string here", reason: "not_found" }]);
  });

  it("reports patches with empty find strings", () => {
    const { content, failed } = applyPatches(base, [{ find: "", replace: "x" }]);
    expect(content).toBe(base);
    expect(failed).toEqual([{ index: 0, find: "", reason: "empty_find" }]);
  });

  it("rejects ambiguous matches with line numbers (no silent first-occurrence pick)", () => {
    // Two-line file where the find string appears on lines 1 and 3.
    // applyPatches MUST NOT silently pick the first occurrence — it
    // should fail the patch with reason:"ambiguous" and surface both
    // line numbers so the model can add disambiguating context.
    const repeated = "color: red;\nbg: blue;\ncolor: red;\n";
    const { content, appliedCount, failed } = applyPatches(repeated, [
      { find: "color: red;", replace: "color: green;" },
    ]);
    expect(content).toBe(repeated);
    expect(appliedCount).toBe(0);
    expect(failed).toEqual([
      { index: 0, find: "color: red;", reason: "ambiguous", matchLines: [1, 3] },
    ]);
  });

  it("rejects ambiguous matches even after JSON-unescape fallback", () => {
    // The model sent "\\n" in find, which unescapes to "\n" and then
    // matches two locations. Ambiguity wins over the escape fallback.
    const file = "a\nx\nb\nx\nc";
    const { content, appliedCount, failed } = applyPatches(file, [
      { find: "\\nx", replace: "\nY" },
    ]);
    expect(content).toBe(file);
    expect(appliedCount).toBe(0);
    expect(failed[0]?.reason).toBe("ambiguous");
    expect(failed[0]?.matchLines).toEqual([1, 3]);
  });

  it("applies cleanly when added context disambiguates", () => {
    // Same repeated-line file as the ambiguous test, but the model
    // included one line of surrounding context so the find is unique.
    const repeated = "color: red;\nbg: blue;\ncolor: red;\n";
    const { content, appliedCount, failed } = applyPatches(repeated, [
      { find: "bg: blue;\ncolor: red;", replace: "bg: blue;\ncolor: green;" },
    ]);
    expect(content).toBe("color: red;\nbg: blue;\ncolor: green;\n");
    expect(appliedCount).toBe(1);
    expect(failed).toEqual([]);
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

  it("reports ambiguous matchLines against the ORIGINAL content, not the mid-batch buffer", () => {
    // An earlier patch in the same batch inserts a line, shifting every
    // following line down by one in the mutated working buffer. A later
    // patch is ambiguous (DUP appears twice). Because the WHOLE call
    // reverts atomically, the model re-reads the ORIGINAL file — so the
    // reported matchLines must reference original positions [3, 5], NOT
    // the post-insert positions [4, 6] of the buffer that gets discarded.
    const original = "A\nB\nDUP\nC\nDUP\n"; // DUP on original lines 3 and 5
    const { content, appliedCount, failed } = applyPatches(original, [
      { find: "A\nB\n", replace: "A\nB\nINSERTED\n" }, // applies, shifts later lines +1
      { find: "DUP", replace: "X" }, // ambiguous: 2 matches
    ]);
    expect(content).toBe(original); // atomic revert
    expect(appliedCount).toBe(0);
    expect(failed).toEqual([{ index: 1, find: "DUP", reason: "ambiguous", matchLines: [3, 5] }]);
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
      "function App() {",
      "  return (",
      "    <div>",
      '      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13l4 4L19 7" /></svg>',
      "      <button onClick={handleSubmit}>Save</button>",
      "    </div>",
      "  );",
      "}",
    ].join("\n");
    const find = [
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">',
      '  <path d="M12 5l7 7-7 7" />',
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
      "function App() {",
      '  return <svg viewBox="0 0 24 24" fill="none"><path d="M5 13" /></svg>;',
      "}",
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
    expect(snip.content).toBe(
      ["8: line 8", "9: line 9", "10: line 10", "11: line 11", "12: line 12"].join("\n")
    );
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

// ---------------------------------------------------------------------------
// create_file: Read-before-Write contract (Claude Code-style)
// ---------------------------------------------------------------------------

describe("create_file enforces Read-before-Write for overwrites", () => {
  function makeTools(): {
    storage: MapFileStorage;
    createFile: ToolConfig;
    deleteFile: ToolConfig;
    readFile: ToolConfig;
  } {
    const storage = new MapFileStorage();
    const tools = createAppGenerationTools({
      getConversationId: () => "test-conv",
      storage,
      logError: () => undefined,
    });
    const findTool = (name: string): ToolConfig => {
      const t = tools.find((tt) => (tt.function as { name: string }).name === name);
      if (!t) throw new Error(`tool ${name} not found`);
      return t;
    };
    return {
      storage,
      createFile: findTool("create_file"),
      deleteFile: findTool("delete_file"),
      readFile: findTool("read_file"),
    };
  }

  it("creates new files without requiring a prior read", async () => {
    const { createFile, storage } = makeTools();
    const result = (await createFile.executor!({
      files: [{ path: "App.js", content: "export default function App() { return null; }\n" }],
    })) as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(result.paths).toEqual(["App.js"]);
    expect((await storage.getFile("test-conv", "App.js"))?.content).toContain("App");
  });

  it("allows overwrite of a file the model created in this conversation (write counts as read)", async () => {
    const { createFile, storage } = makeTools();
    await createFile.executor!({
      files: [{ path: "App.js", content: "const A = 1;\n" }],
    });
    const result = (await createFile.executor!({
      files: [{ path: "App.js", content: "const A = 2;\n" }],
    })) as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect((await storage.getFile("test-conv", "App.js"))?.content).toBe("const A = 2;\n");
  });

  it("marks files seen by their normalized request path, not the storage-returned path", async () => {
    // Third-party AppFileStorage adapters may return a differently
    // shaped `path` than the one they were queried with (e.g. an
    // absolute path, or a workspace-prefixed key). The read-before-
    // write contract must key off the path the model asked for so
    // that subsequent patch_file / create_file lookups hit the same
    // slot. Regression test for the bug where markFileSeen used
    // `file.path` instead of the normalized local `path`.
    class PathShiftingStorage implements AppFileStorage {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getFile(_convId: string, p: string): Promise<AppFileRecord | null> {
        return Promise.resolve({ path: `/workspace/${p}`, content: "const A = 1;\n" });
      }
      getFiles(): Promise<AppFileRecord[]> {
        return Promise.resolve([]);
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      putFile(_convId: string, _p: string, _c: string): Promise<void> {
        return Promise.resolve();
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      putFiles(_convId: string, _files: Array<{ path: string; content: string }>): Promise<void> {
        return Promise.resolve();
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      deleteFile(_convId: string, _p: string): Promise<void> {
        return Promise.resolve();
      }
    }
    const tools = createAppGenerationTools({
      getConversationId: () => "shift-conv",
      storage: new PathShiftingStorage(),
      logError: () => undefined,
    });
    const readFile = tools.find((t) => (t.function as { name: string }).name === "read_file")!;
    const createFile = tools.find((t) => (t.function as { name: string }).name === "create_file")!;

    await readFile.executor!({ path: "App.js" });
    // After read_file, the model is allowed to overwrite App.js even
    // though storage hands back `/workspace/App.js`.
    const result = (await createFile.executor!({
      files: [{ path: "App.js", content: "const A = 2;\n" }],
    })) as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it("evicts oldest conversation state when maxConversations cap is exceeded", async () => {
    // Long-running factory + low cap → confirm that read-before-write
    // state for the LEAST RECENTLY USED conversation is dropped when
    // a new one pushes the map over the cap. Evicted conversation
    // must then re-read before it can patch — same as cold start.
    const storage = new MapFileStorage();
    storage.getAll().set("App.js", "const A = 1;\n");
    let convId = "conv-1";
    const tools = createAppGenerationTools({
      getConversationId: () => convId,
      storage,
      logError: () => undefined,
      maxConversations: 2,
    });
    const findTool = (name: string): ToolConfig =>
      tools.find((t) => (t.function as { name: string }).name === name)!;
    const readFile = findTool("read_file");
    const patchFile = findTool("patch_file");

    // Conv-1: read so we may patch
    await readFile.executor!({ path: "App.js" });

    // Two more conversations bump the cap and evict conv-1 (least
    // recently used — it never acted again after its initial read).
    convId = "conv-2";
    await readFile.executor!({ path: "App.js" });
    convId = "conv-3";
    await readFile.executor!({ path: "App.js" });

    // Back to conv-1 — its seen-state should be gone, so patch_file
    // refuses with the read-before-write error.
    convId = "conv-1";
    const result = (await patchFile.executor!({
      path: "App.js",
      patches: [{ find: "const A = 1;", replace: "const A = 2;" }],
    })) as Record<string, unknown>;
    expect(result.success).toBeUndefined();
    expect(String(result.error)).toMatch(/read_file/);
  });

  it("keeps a recently active conversation when the cap evicts (LRU, not FIFO)", async () => {
    // Regression: markFileSeen used to refresh a conversation's map
    // position only on first insertion, so eviction was FIFO in practice —
    // a conversation that kept writing could be evicted before an idle one
    // that merely arrived later, hitting spurious "read_file first" errors
    // mid-conversation.
    const storage = new MapFileStorage();
    storage.getAll().set("App.js", "const A = 1;\n");
    let convId = "conv-1";
    const tools = createAppGenerationTools({
      getConversationId: () => convId,
      storage,
      logError: () => undefined,
      maxConversations: 2,
    });
    const findTool = (name: string): ToolConfig =>
      tools.find((t) => (t.function as { name: string }).name === name)!;
    const readFile = findTool("read_file");
    const patchFile = findTool("patch_file");

    // conv-1 then conv-2 read (insertion order: conv-1, conv-2).
    await readFile.executor!({ path: "App.js" });
    convId = "conv-2";
    await readFile.executor!({ path: "App.js" });

    // conv-1 stays active by patching — a successful patch must promote
    // it past the idle conv-2.
    convId = "conv-1";
    const patched = (await patchFile.executor!({
      path: "App.js",
      patches: [{ find: "const A = 1;", replace: "const A = 2;" }],
    })) as Record<string, unknown>;
    expect(patched.success).toBe(true);

    // conv-3 pushes the map over the cap → the idle conv-2 is evicted,
    // not the active conv-1.
    convId = "conv-3";
    await readFile.executor!({ path: "App.js" });

    // conv-1 can still patch without re-reading…
    convId = "conv-1";
    const again = (await patchFile.executor!({
      path: "App.js",
      patches: [{ find: "const A = 2;", replace: "const A = 3;" }],
    })) as Record<string, unknown>;
    expect(again.success).toBe(true);

    // …while conv-2 lost its seen-state and must re-read first.
    convId = "conv-2";
    const evicted = (await patchFile.executor!({
      path: "App.js",
      patches: [{ find: "const A = 3;", replace: "const A = 4;" }],
    })) as Record<string, unknown>;
    expect(evicted.success).toBeUndefined();
    expect(String(evicted.error)).toMatch(/read_file/);
  });

  it("allows overwrite after read_file", async () => {
    const { createFile, readFile, storage } = makeTools();
    // Simulate a file that exists in storage but wasn't created by the model.
    (storage as MapFileStorage).getAll().set("App.js", "const A = 1;\n");
    // Read first, then overwrite.
    await readFile.executor!({ path: "App.js" });
    const result = (await createFile.executor!({
      files: [{ path: "App.js", content: "const A = 2;\n" }],
    })) as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect((await storage.getFile("test-conv", "App.js"))?.content).toBe("const A = 2;\n");
  });

  it("refuses overwrite when the file exists but the model has not read or created it", async () => {
    const { createFile } = makeTools();
    // File exists in storage but model has not touched it in this conversation.
    // (e.g. host pre-populated, or a different session.)
    const { storage } = makeTools(); // fresh conversation
    storage.getAll().set("App.js", "pre-existing content\n");
    const tools = createAppGenerationTools({
      getConversationId: () => "test-conv-2",
      storage,
      logError: () => undefined,
    });
    const cf = tools.find((t) => (t.function as { name: string }).name === "create_file")!;
    const result = (await cf.executor!({
      files: [{ path: "App.js", content: "new content\n" }],
    })) as Record<string, unknown>;
    expect(result.success).toBeUndefined();
    expect(result.error).toEqual(expect.stringContaining("have not read"));
    expect(result.error).toEqual(expect.stringContaining("read_file"));
    expect(result.unreadOverwrites).toEqual(["App.js"]);
    // Ensure createFile is the one we used (silences the unused-variable warning).
    expect(createFile).toBeDefined();
  });

  it("is atomic: when any overwrite is unread, NO files are written (not even new ones)", async () => {
    const { storage } = makeTools();
    storage.getAll().set("App.js", "pre-existing\n");
    const tools = createAppGenerationTools({
      getConversationId: () => "test-conv-3",
      storage,
      logError: () => undefined,
    });
    const cf = tools.find((t) => (t.function as { name: string }).name === "create_file")!;
    await cf.executor!({
      files: [
        { path: "App.js", content: "rewrite without reading\n" }, // unread overwrite
        { path: "App.css", content: "body {}\n" }, // new file, would be fine alone
      ],
    });
    // App.js unchanged, App.css NOT created (atomic refusal).
    expect(storage.getAll().get("App.js")).toBe("pre-existing\n");
    expect(await storage.getFile("test-conv-3", "App.css")).toBeNull();
  });

  it("after delete_file, create_file for the same path is a fresh creation (no read needed)", async () => {
    const { createFile, deleteFile, storage } = makeTools();
    await createFile.executor!({
      files: [{ path: "App.js", content: "const A = 1;\n" }],
    });
    await deleteFile.executor!({ path: "App.js" });
    // After delete, App.js is gone from seen-files; recreating it is a new file.
    const result = (await createFile.executor!({
      files: [{ path: "App.js", content: "const A = 2;\n" }],
    })) as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect((await storage.getFile("test-conv", "App.js"))?.content).toBe("const A = 2;\n");
  });

  it("normalizes paths before checking — '/App.js' counts as same file as 'App.js'", async () => {
    const { storage } = makeTools();
    storage.getAll().set("App.js", "pre-existing\n");
    const tools = createAppGenerationTools({
      getConversationId: () => "test-conv-4",
      storage,
      logError: () => undefined,
    });
    const cf = tools.find((t) => (t.function as { name: string }).name === "create_file")!;
    const result = (await cf.executor!({
      files: [{ path: "/App.js", content: "rewrite\n" }],
    })) as Record<string, unknown>;
    expect(result.error).toEqual(expect.stringContaining("have not read"));
    expect(result.unreadOverwrites).toEqual(["App.js"]);
  });
});

// ---------------------------------------------------------------------------
// critique_design tool
// ---------------------------------------------------------------------------

describe("critique_design", () => {
  function makeTools(overrides?: Partial<Parameters<typeof createAppGenerationTools>[0]>): {
    storage: MapFileStorage;
    critique: ToolConfig;
    createFile: ToolConfig;
  } {
    const storage = new MapFileStorage();
    const tools = createAppGenerationTools({
      getConversationId: () => "test-conv",
      storage,
      logError: () => undefined,
      ...overrides,
    });
    const find = (name: string): ToolConfig => {
      const t = tools.find((tt) => (tt.function as { name: string }).name === name);
      if (!t) throw new Error(`tool ${name} not found`);
      return t;
    };
    return { storage, critique: find("critique_design"), createFile: find("create_file") };
  }

  it("returns the current App.js + App.css alongside the rubric", async () => {
    const { critique, createFile } = makeTools();
    await createFile.executor!({
      files: [
        { path: "App.js", content: "export default function App() { return null; }\n" },
        { path: "App.css", content: ":root { --bg: #fff; }\n" },
      ],
    });
    const result = (await critique.executor!({})) as Record<string, unknown>;
    expect(result.appJs).toMatchObject({ path: "App.js", lines: expect.any(Number) });
    expect(result.appCss).toMatchObject({ path: "App.css", lines: expect.any(Number) });
    expect((result.appJs as { content: string }).content).toContain("function App");
    expect((result.appCss as { content: string }).content).toContain(":root");
  });

  it("returns the default rubric questions when no override is supplied", async () => {
    const { critique, createFile } = makeTools();
    await createFile.executor!({
      files: [{ path: "App.js", content: "export default function App() { return null; }\n" }],
    });
    const result = (await critique.executor!({})) as { rubric: readonly string[] };
    expect(result.rubric).toEqual(DEFAULT_DESIGN_CRITIQUE_RUBRIC);
    expect(result.rubric.length).toBeGreaterThanOrEqual(4);
  });

  it("honors a host-supplied rubric override", async () => {
    const customRubric = [
      "Does this app feel like the Acme brand?",
      "Where could you push the visual identity further?",
    ];
    const { critique, createFile } = makeTools({ designCritiqueRubric: customRubric });
    await createFile.executor!({
      files: [{ path: "App.js", content: "export default function App() { return null; }\n" }],
    });
    const result = (await critique.executor!({})) as { rubric: readonly string[] };
    expect(result.rubric).toEqual(customRubric);
  });

  it("includes the instruction that nudges the model toward substantive critique + patch", async () => {
    const { critique, createFile } = makeTools();
    await createFile.executor!({
      files: [{ path: "App.js", content: "export default function App() { return null; }\n" }],
    });
    const result = (await critique.executor!({})) as { instruction: string };
    expect(result.instruction).toEqual(expect.stringContaining("answer each"));
    expect(result.instruction).toEqual(expect.stringContaining("patch"));
  });

  it("falls back to App.jsx when App.js is absent", async () => {
    const { critique, createFile } = makeTools();
    await createFile.executor!({
      files: [{ path: "App.jsx", content: "export default function App() { return null; }\n" }],
    });
    const result = (await critique.executor!({})) as { appJs: { content: string } };
    expect(result.appJs.content).toContain("function App");
  });

  it("returns empty content fields when no files exist (lets the model fail loudly)", async () => {
    const { critique } = makeTools();
    const result = (await critique.executor!({})) as {
      appJs: { content: string; lines: number };
      appCss: { content: string; lines: number };
    };
    expect(result.appJs.content).toBe("");
    expect(result.appCss.content).toBe("");
  });
});

// ---------------------------------------------------------------------------
// onFileChange callback — host-side hook for versioning / audit / analytics
// ---------------------------------------------------------------------------

describe("onFileChange callback", () => {
  function makeTools(overrides?: Partial<Parameters<typeof createAppGenerationTools>[0]>): {
    storage: MapFileStorage;
    events: FileChangeEvent[];
    onFileChange: (e: FileChangeEvent) => void;
    tools: Record<string, ToolConfig>;
  } {
    const storage = new MapFileStorage();
    const events: FileChangeEvent[] = [];
    const onFileChange = (e: FileChangeEvent): void => {
      events.push(e);
    };
    const tools = createAppGenerationTools({
      getConversationId: () => "conv-1",
      storage,
      logError: () => undefined,
      onFileChange,
      ...overrides,
    });
    const byName: Record<string, ToolConfig> = {};
    for (const t of tools) byName[(t.function as { name: string }).name] = t;
    return { storage, events, onFileChange, tools: byName };
  }

  it("emits one `created` event per new file in a create_file batch", async () => {
    const { events, tools } = makeTools();
    await tools.create_file!.executor!({
      files: [
        { path: "App.js", content: "const A = 1;\n" },
        { path: "App.css", content: ":root {}\n" },
      ],
    });
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      type: "created",
      conversationId: "conv-1",
      path: "App.js",
      content: "const A = 1;\n",
      tool: "create_file",
    });
    expect(events[1]).toMatchObject({ type: "created", path: "App.css" });
  });

  it("emits `modified` (not `created`) when create_file overwrites an existing file", async () => {
    const { events, tools, storage } = makeTools();
    // Seed an existing file + mark it seen so the read-before-write
    // contract permits the overwrite.
    storage.getAll().set("App.js", "const A = 1;\n");
    await tools.read_file!.executor!({ path: "App.js" });
    events.length = 0; // ignore any reads (there are none, but just in case)

    await tools.create_file!.executor!({
      files: [{ path: "App.js", content: "const A = 2;\n" }],
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "modified",
      conversationId: "conv-1",
      path: "App.js",
      before: "const A = 1;\n",
      after: "const A = 2;\n",
      tool: "create_file",
    });
  });

  it("emits `modified` from patch_file with before/after content", async () => {
    const { events, tools } = makeTools();
    await tools.create_file!.executor!({
      files: [{ path: "App.js", content: "const A = 1;\nconst B = 2;\n" }],
    });
    events.length = 0;

    await tools.patch_file!.executor!({
      path: "App.js",
      patches: [{ find: "const A = 1;", replace: "const A = 99;" }],
    });
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "modified",
      conversationId: "conv-1",
      path: "App.js",
      before: "const A = 1;\nconst B = 2;\n",
      after: "const A = 99;\nconst B = 2;\n",
      tool: "patch_file",
    });
  });

  it("emits `deleted` with the pre-delete content", async () => {
    const { events, tools } = makeTools();
    await tools.create_file!.executor!({
      files: [{ path: "App.js", content: "const X = 1;\n" }],
    });
    events.length = 0;

    await tools.delete_file!.executor!({ path: "App.js" });
    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({
      type: "deleted",
      conversationId: "conv-1",
      path: "App.js",
      before: "const X = 1;\n",
      tool: "delete_file",
    });
  });

  it("does NOT emit for read_file or list_files (no mutation)", async () => {
    const { events, tools } = makeTools();
    await tools.create_file!.executor!({
      files: [{ path: "App.js", content: "const A = 1;\n" }],
    });
    events.length = 0;

    await tools.read_file!.executor!({ path: "App.js" });
    await tools.list_files!.executor!({});
    expect(events).toEqual([]);
  });

  it("does NOT emit when create_file fails validation", async () => {
    const { events, tools } = makeTools();
    const broken = "function App() { return <div>;}\n";
    const result = (await tools.create_file!.executor!({
      files: [{ path: "App.js", content: broken }],
    })) as Record<string, unknown>;
    expect(result.error).toBeTruthy();
    expect(events).toEqual([]);
  });

  it("does NOT emit when patch_file has unmatched patches", async () => {
    const { events, tools } = makeTools();
    await tools.create_file!.executor!({
      files: [{ path: "App.js", content: "const A = 1;\n" }],
    });
    events.length = 0;

    const result = (await tools.patch_file!.executor!({
      path: "App.js",
      patches: [{ find: "totally-not-in-the-file", replace: "x" }],
    })) as Record<string, unknown>;
    expect(result.success).toBe(false);
    expect(events).toEqual([]);
  });

  it("does NOT emit when delete_file targets a non-existent file", async () => {
    const { events, tools } = makeTools();
    await tools.delete_file!.executor!({ path: "ghost.js" });
    expect(events).toEqual([]);
  });

  it("a thrown callback is logged and swallowed — the tool still succeeds", async () => {
    const logged: string[] = [];
    const storage = new MapFileStorage();
    const tools = createAppGenerationTools({
      getConversationId: () => "conv-1",
      storage,
      logError: (msg) => logged.push(msg),
      onFileChange: () => {
        throw new Error("host analytics is down");
      },
    });
    const createFile = tools.find((t) => (t.function as { name: string }).name === "create_file")!;
    const result = (await createFile.executor!({
      files: [{ path: "App.js", content: "const A = 1;\n" }],
    })) as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(logged.some((m) => m.includes("onFileChange"))).toBe(true);
    // Underlying write still happened.
    expect((await storage.getFile("conv-1", "App.js"))?.content).toBe("const A = 1;\n");
  });

  it("awaits async callbacks before returning the tool result", async () => {
    const order: string[] = [];
    const storage = new MapFileStorage();
    const tools = createAppGenerationTools({
      getConversationId: () => "conv-1",
      storage,
      logError: () => undefined,
      onFileChange: async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push("callback-done");
      },
    });
    const createFile = tools.find((t) => (t.function as { name: string }).name === "create_file")!;
    await createFile.executor!({
      files: [{ path: "App.js", content: "const A = 1;\n" }],
    });
    order.push("executor-returned");
    expect(order).toEqual(["callback-done", "executor-returned"]);
  });
});

// ---------------------------------------------------------------------------
// create_file split — created vs overwritten + soft patch_file nudge
// ---------------------------------------------------------------------------

describe("create_file result splits new writes from overwrites", () => {
  function makeTools(): {
    storage: MapFileStorage;
    createFile: ToolConfig;
    readFile: ToolConfig;
  } {
    const storage = new MapFileStorage();
    const tools = createAppGenerationTools({
      getConversationId: () => "test-conv",
      storage,
      logError: () => undefined,
    });
    const find = (name: string): ToolConfig => {
      const t = tools.find((tt) => (tt.function as { name: string }).name === name);
      if (!t) throw new Error(`tool ${name} not found`);
      return t;
    };
    return { storage, createFile: find("create_file"), readFile: find("read_file") };
  }

  it("populates `created` with new files and leaves `overwritten` empty", async () => {
    const { createFile } = makeTools();
    const result = (await createFile.executor!({
      files: [
        { path: "App.js", content: "const A = 1;\n" },
        { path: "App.css", content: ":root {}\n" },
      ],
    })) as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(result.created).toEqual(["App.js", "App.css"]);
    expect(result.overwritten).toEqual([]);
    expect(result.note).toBeUndefined();
    // `paths` (the union) still works for back-compat consumers.
    expect(result.paths).toEqual(["App.js", "App.css"]);
  });

  it("populates `overwritten` with existing paths and adds the patch_file nudge", async () => {
    const { createFile } = makeTools();
    await createFile.executor!({
      files: [{ path: "App.js", content: "const A = 1;\n" }],
    });
    const result = (await createFile.executor!({
      files: [{ path: "App.js", content: "const A = 2;\n" }],
    })) as Record<string, unknown>;
    expect(result.success).toBe(true);
    expect(result.created).toEqual([]);
    expect(result.overwritten).toEqual(["App.js"]);
    expect(result.note).toEqual(expect.stringContaining("prefer patch_file"));
    expect(result.note).toEqual(expect.stringContaining("App.js"));
  });

  it("suggests audit_design when an audited file is rewritten", async () => {
    // Rewrites of App.js/App.css are where class names and selectors
    // desync — the note should point at the audit right then.
    const { createFile } = makeTools();
    await createFile.executor!({
      files: [{ path: "App.css", content: ":root { --ink: #111; }\n" }],
    });
    const result = (await createFile.executor!({
      files: [{ path: "App.css", content: ":root { --ink: #222; }\n" }],
    })) as Record<string, unknown>;
    expect(result.overwritten).toEqual(["App.css"]);
    expect(result.note).toEqual(expect.stringContaining("audit_design"));
  });

  it("keeps the note free of the audit nudge for non-audited files", async () => {
    const { createFile } = makeTools();
    await createFile.executor!({
      files: [{ path: "data.json", content: "[]\n" }],
    });
    const result = (await createFile.executor!({
      files: [{ path: "data.json", content: "[1]\n" }],
    })) as Record<string, unknown>;
    expect(result.overwritten).toEqual(["data.json"]);
    expect(result.note).toEqual(expect.stringContaining("prefer patch_file"));
    expect(result.note).not.toEqual(expect.stringContaining("audit_design"));
  });

  it("partitions a mixed batch — new and existing — into the two arrays", async () => {
    const { createFile } = makeTools();
    await createFile.executor!({
      files: [{ path: "App.js", content: "const A = 1;\n" }],
    });
    const result = (await createFile.executor!({
      files: [
        { path: "App.js", content: "const A = 2;\n" },
        { path: "App.css", content: "body {}\n" },
        { path: "package.json", content: '{"name":"x"}\n' },
      ],
    })) as Record<string, unknown>;
    expect(result.created).toEqual(["App.css", "package.json"]);
    expect(result.overwritten).toEqual(["App.js"]);
    expect(result.note).toEqual(expect.stringContaining("Overwrote 1"));
  });
});

// ---------------------------------------------------------------------------
// verify_app tool — host-runtime verification hook
// ---------------------------------------------------------------------------

describe("verify_app tool", () => {
  function makeTools(overrides?: Partial<Parameters<typeof createAppGenerationTools>[0]>): {
    storage: MapFileStorage;
    verify: ToolConfig;
    logged: string[];
  } {
    const logged: string[] = [];
    const storage = new MapFileStorage();
    const tools = createAppGenerationTools({
      getConversationId: () => "test-conv",
      storage,
      logError: (msg) => logged.push(msg),
      ...overrides,
    });
    const t = tools.find((tt) => (tt.function as { name: string }).name === "verify_app");
    if (!t) throw new Error("verify_app tool not in registered tools");
    return { storage, verify: t, logged };
  }

  it("returns a graceful no-op result when the host did not wire verifyApp", async () => {
    const { verify } = makeTools();
    const result = (await verify.executor!({})) as Record<string, unknown>;
    expect(result.rendered).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.note).toEqual(expect.stringContaining("did not wire"));
  });

  it("forwards the host's success result verbatim (rendered: true, no errors)", async () => {
    const { verify } = makeTools({
      verifyApp: async () => ({ rendered: true, errors: [] }),
    });
    const result = (await verify.executor!({})) as Record<string, unknown>;
    expect(result.rendered).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.note).toBeUndefined();
  });

  it("forwards the host's failure result with errors", async () => {
    const { verify } = makeTools({
      verifyApp: async () => ({
        rendered: false,
        errors: [
          "The requested module 'lucide-react' does not provide an export named 'LayoutKanban'",
          "Cannot read properties of undefined (reading 'map')",
        ],
      }),
    });
    const result = (await verify.executor!({})) as Record<string, unknown>;
    expect(result.rendered).toBe(false);
    expect(result.errors).toHaveLength(2);
    expect((result.errors as string[])[0]).toMatch(/LayoutKanban/);
  });

  it("propagates the host's `note` so the model can disambiguate degenerate results", async () => {
    const { verify } = makeTools({
      verifyApp: async () => ({
        rendered: true,
        errors: [],
        note: "Sandpack still compiling — preview not yet mounted.",
      }),
    });
    const result = (await verify.executor!({})) as Record<string, unknown>;
    expect(result.note).toEqual(expect.stringContaining("still compiling"));
  });

  it("coerces a malformed host return shape into the expected structure", async () => {
    const { verify } = makeTools({
      verifyApp: (async () => ({
        // Host returned wrong types — should be coerced, not crash.
        rendered: 1,
        errors: "single error string (should be array)",
        note: 42,
      })) as unknown as () => Promise<import("./appGeneration.js").VerifyAppResult>,
    });
    const result = (await verify.executor!({})) as Record<string, unknown>;
    expect(result.rendered).toBe(true); // Number 1 coerces to true.
    expect(result.errors).toEqual([]); // Non-array becomes empty list.
    expect(result.note).toBe("42"); // Stringified.
  });

  it("catches a thrown host hook and returns a useful failure (not silent)", async () => {
    const { verify, logged } = makeTools({
      verifyApp: async () => {
        throw new Error("Sandpack iframe disconnected");
      },
    });
    const result = (await verify.executor!({})) as Record<string, unknown>;
    expect(result.rendered).toBe(false);
    expect(result.errors).toEqual([expect.stringContaining("Sandpack iframe disconnected")]);
    expect(result.note).toEqual(expect.stringContaining("verifier itself errored"));
    // The host-hook throw is logged, not swallowed silently.
    expect(logged.some((m) => m.includes("verifyApp hook threw"))).toBe(true);
  });

  it("is included in APP_FILE_TOOL_NAMES (so allowlists pick it up)", async () => {
    // Cross-module assertion: the schema name in this test file must
    // match what the tool registers. If verify_app is renamed, both
    // places must move together.
    const { APP_FILE_TOOL_NAMES } = await import("./appGeneration.js");
    expect(APP_FILE_TOOL_NAMES.has("verify_app")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// patch_file thrash gating — not_found streak vs. ambiguous failures
// ---------------------------------------------------------------------------

describe("patch_file thrash gating", () => {
  // Reuses the executor-driving harness from the read-before-write / LRU
  // eviction tests above: MapFileStorage + a fixed conversation id, then
  // mark the file seen via read_file so patch_file's read-before-write
  // contract is satisfied.
  function makeTools(seedContent: string): {
    storage: MapFileStorage;
    readFile: ToolConfig;
    patchFile: ToolConfig;
  } {
    const storage = new MapFileStorage();
    storage.getAll().set("App.js", seedContent);
    const tools = createAppGenerationTools({
      getConversationId: () => "thrash-conv",
      storage,
      logError: () => undefined,
    });
    const findTool = (name: string): ToolConfig => {
      const t = tools.find((tt) => (tt.function as { name: string }).name === name);
      if (!t) throw new Error(`tool ${name} not found`);
      return t;
    };
    return { storage, readFile: findTool("read_file"), patchFile: findTool("patch_file") };
  }

  it("an ambiguous failure does NOT inherit a prior not_found streak's STOP directive", async () => {
    // "const A = 1;" appears twice -> ambiguous. "NOPE" never appears ->
    // not_found, used to drive the failure counter up to threshold.
    const { readFile, patchFile } = makeTools("const A = 1;\nconst A = 1;\n");
    await readFile.executor!({ path: "App.js" }); // satisfy read-before-write

    // Drive PATCH_FAILURE_THRESHOLD (=2) consecutive not_found failures so
    // the failure counter is at/over threshold and the NEXT not_found WOULD
    // emit the STOP directive.
    const stop = (await patchFile.executor!({
      path: "App.js",
      patches: [{ find: "NOPE", replace: "x" }],
    })) as Record<string, unknown>;
    const stop2 = (await patchFile.executor!({
      path: "App.js",
      patches: [{ find: "NOPE", replace: "x" }],
    })) as Record<string, unknown>;
    // Sanity: by the second failure the STOP directive is in force, proving
    // the counter is at/over threshold for the next not_found.
    expect(String(stop2.message)).toContain("STOP retrying patches");
    expect(String(stop.message)).not.toContain("STOP retrying patches");

    // Now an AMBIGUOUS patch. It must get the tailored ambiguous response
    // (matchLines + "add context"), NOT the inherited STOP directive.
    const result = (await patchFile.executor!({
      path: "App.js",
      patches: [{ find: "const A = 1;", replace: "const A = 2;" }],
    })) as Record<string, unknown>;
    expect(result.success).toBe(false);
    expect(String(result.message)).not.toContain("STOP retrying patches");
    // Tailored ambiguous message mentions adding surrounding context.
    expect(String(result.message)).toContain("context");
    const failedPatches = result.failedPatches as Array<{
      reason: string;
      matchLines?: number[];
    }>;
    expect(failedPatches).toHaveLength(1);
    expect(failedPatches[0]?.reason).toBe("ambiguous");
    expect(failedPatches[0]?.matchLines).toEqual([1, 2]);
  });

  it("read_file resets the thrash counter — the next not_found is first-failure, not STOP", async () => {
    // No duplicate needed here: every patch is not_found ("NOPE").
    const { readFile, patchFile } = makeTools("const A = 1;\nconst B = 2;\n");
    await readFile.executor!({ path: "App.js" }); // satisfy read-before-write

    // Drive enough not_found failures to trigger the STOP directive.
    await patchFile.executor!({ path: "App.js", patches: [{ find: "NOPE", replace: "x" }] });
    const stop = (await patchFile.executor!({
      path: "App.js",
      patches: [{ find: "NOPE", replace: "x" }],
    })) as Record<string, unknown>;
    expect(String(stop.message)).toContain("STOP retrying patches");

    // Re-read the file: this clears the failure streak.
    await readFile.executor!({ path: "App.js" });

    // One more not_found patch. Because the streak was cleared, this is
    // the FIRST-FAILURE treatment, NOT the immediate STOP directive.
    const result = (await patchFile.executor!({
      path: "App.js",
      patches: [{ find: "NOPE", replace: "x" }],
    })) as Record<string, unknown>;
    expect(result.success).toBe(false);
    expect(String(result.message)).not.toContain("STOP retrying patches");
    // First-failure message: the "did not apply / File NOT modified" framing.
    expect(String(result.message)).toContain("File NOT modified");
  });
});
