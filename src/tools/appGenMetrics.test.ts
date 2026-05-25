import { describe, it, expect } from "vitest";

import {
  compareRuns,
  finalizeRun,
  type RunRecord,
  SCHEMA_VERSION,
  shortHash,
  summarizePhase,
  type ToolCallRecord,
} from "./appGenMetrics.js";

describe("summarizePhase", () => {
  it("counts tool calls by name", () => {
    const toolCalls: ToolCallRecord[] = [
      { name: "create_file", result: "ok" },
      { name: "create_file", result: "ok" },
      { name: "patch_file", result: JSON.stringify({ applied: 1, failed: 0 }) },
      { name: "read_file", result: "ok" },
    ];
    const p = summarizePhase({
      label: "p1",
      elapsedMs: 1234,
      toolCalls,
      files: new Map([["App.js", "abc"]]),
    });
    expect(p.toolCalls).toEqual({ create_file: 2, patch_file: 1, read_file: 1 });
  });

  it("counts failed patches (failed > 0)", () => {
    const toolCalls: ToolCallRecord[] = [
      { name: "patch_file", result: JSON.stringify({ applied: 2, failed: 0 }) },
      { name: "patch_file", result: JSON.stringify({ applied: 1, failed: 1 }) },
      { name: "patch_file", result: { applied: 0, failed: 3 } },
    ];
    expect(
      summarizePhase({
        label: "p1",
        elapsedMs: 0,
        toolCalls,
        files: {},
      }).failedPatches
    ).toBe(2);
  });

  it("ignores non-patch tools when counting failures", () => {
    const toolCalls: ToolCallRecord[] = [
      { name: "create_file", result: JSON.stringify({ failed: 99 }) },
    ];
    expect(summarizePhase({ label: "p1", elapsedMs: 0, toolCalls, files: {} }).failedPatches).toBe(
      0
    );
  });

  it("tolerates malformed patch_file results without throwing", () => {
    const toolCalls: ToolCallRecord[] = [
      { name: "patch_file", result: "not-json-at-all" },
      { name: "patch_file", result: null },
    ];
    expect(summarizePhase({ label: "p1", elapsedMs: 0, toolCalls, files: {} }).failedPatches).toBe(
      0
    );
  });

  it("records file sizes from a Map or an object", () => {
    const fromMap = summarizePhase({
      label: "p1",
      elapsedMs: 0,
      toolCalls: [],
      files: new Map([
        ["App.js", "x".repeat(100)],
        ["App.css", "y".repeat(50)],
      ]),
    });
    expect(fromMap.files).toEqual({ "App.js": 100, "App.css": 50 });

    const fromObj = summarizePhase({
      label: "p1",
      elapsedMs: 0,
      toolCalls: [],
      files: { "App.js": "x".repeat(100), "App.css": "y".repeat(50) },
    });
    expect(fromObj.files).toEqual({ "App.js": 100, "App.css": 50 });
  });

  it("captures the errored flag", () => {
    expect(
      summarizePhase({ label: "p", elapsedMs: 0, toolCalls: [], files: {}, errored: true }).errored
    ).toBe(true);
    expect(summarizePhase({ label: "p", elapsedMs: 0, toolCalls: [], files: {} }).errored).toBe(
      false
    );
  });
});

describe("finalizeRun", () => {
  it("sums elapsed and tool counts across phases", () => {
    const run = finalizeRun({
      benchmark: "kanban",
      model: "anthropic/claude-opus-4-7",
      apiType: "auto",
      promptHash: "abc123",
      startedAt: "2026-05-25T00:00:00.000Z",
      phases: [
        {
          label: "p1",
          elapsedMs: 1000,
          toolCalls: { create_file: 2, patch_file: 1 },
          failedPatches: 0,
          files: { "App.js": 100 },
          errored: false,
        },
        {
          label: "p2",
          elapsedMs: 2000,
          toolCalls: { patch_file: 3, read_file: 1 },
          failedPatches: 1,
          files: { "App.js": 200 },
          errored: false,
        },
      ],
    });

    expect(run.schemaVersion).toBe(SCHEMA_VERSION);
    expect(run.totalElapsedMs).toBe(3000);
    expect(run.totals.toolCalls).toEqual({ create_file: 2, patch_file: 4, read_file: 1 });
    expect(run.totals.failedPatches).toBe(1);
    expect(run.benchmark).toBe("kanban");
    // finishedAt is set to "now" — just sanity-check it's a valid ISO string.
    expect(new Date(run.finishedAt).toString()).not.toBe("Invalid Date");
  });
});

describe("shortHash", () => {
  it("is deterministic and ~12 chars", () => {
    const a = shortHash("the cat sat on the mat");
    const b = shortHash("the cat sat on the mat");
    expect(a).toBe(b);
    expect(a.length).toBe(12);
  });

  it("differs across distinct inputs", () => {
    expect(shortHash("a")).not.toBe(shortHash("b"));
    expect(shortHash("App Builder mode v1")).not.toBe(shortHash("App Builder mode v2"));
  });
});

const baseRun: RunRecord = {
  schemaVersion: SCHEMA_VERSION,
  benchmark: "kanban",
  model: "anthropic/claude-opus-4-7",
  apiType: "auto",
  promptHash: "abc123",
  startedAt: "2026-05-25T00:00:00.000Z",
  finishedAt: "2026-05-25T00:10:00.000Z",
  totalElapsedMs: 600_000,
  phases: [
    {
      label: "p1",
      elapsedMs: 300_000,
      toolCalls: { create_file: 2, patch_file: 1 },
      failedPatches: 0,
      files: { "App.js": 1000, "App.css": 500 },
      errored: false,
    },
    {
      label: "p2",
      elapsedMs: 300_000,
      toolCalls: { patch_file: 3 },
      failedPatches: 1,
      files: { "App.js": 1500, "App.css": 500 },
      errored: false,
    },
  ],
  totals: { toolCalls: { create_file: 2, patch_file: 4 }, failedPatches: 1 },
};

describe("compareRuns", () => {
  it("reports zero deltas when comparing a run to itself", () => {
    const out = compareRuns(baseRun, baseRun);
    expect(out).toContain("create_file");
    expect(out).toMatch(/create_file\s+2 → 2\s+\(0\)/);
    expect(out).not.toContain("⚠");
  });

  it("flags model and prompt changes with a warning", () => {
    const after: RunRecord = {
      ...baseRun,
      model: "anthropic/claude-sonnet-4-6",
      promptHash: "def456",
    };
    const out = compareRuns(baseRun, after);
    expect(out).toContain("⚠ model differs");
    expect(out).toContain("⚠ prompt differs");
  });

  it("shows positive and negative deltas for tool counts", () => {
    const after: RunRecord = {
      ...baseRun,
      totals: { toolCalls: { create_file: 5, patch_file: 2 }, failedPatches: 0 },
    };
    const out = compareRuns(baseRun, after);
    expect(out).toMatch(/create_file.*\(\+3\)/);
    expect(out).toMatch(/patch_file.*\(-2\)/);
    expect(out).toMatch(/failedPatches.*\(-1\)/);
  });

  it("flags phases added or removed", () => {
    const after: RunRecord = {
      ...baseRun,
      phases: [
        baseRun.phases[0],
        baseRun.phases[1],
        {
          label: "p3",
          elapsedMs: 0,
          toolCalls: {},
          failedPatches: 0,
          files: {},
          errored: false,
        },
      ],
    };
    const out = compareRuns(baseRun, after);
    expect(out).toContain("p3: + added");

    const fewer: RunRecord = { ...baseRun, phases: [baseRun.phases[0]] };
    expect(compareRuns(baseRun, fewer)).toContain("p2: - removed");
  });

  it("refuses to compare across schema versions", () => {
    const older = { ...baseRun, schemaVersion: 0 as unknown as typeof SCHEMA_VERSION };
    expect(compareRuns(older, baseRun)).toContain("schema mismatch");
  });
});
