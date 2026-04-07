/**
 * Unit tests for pure helper functions exported from appGeneration.ts.
 * No LLM calls — these run fast and offline.
 */

import { describe, expect, it } from "vitest";

import { normalizePath, truncateContent, applyPatches } from "./appGeneration.js";

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
