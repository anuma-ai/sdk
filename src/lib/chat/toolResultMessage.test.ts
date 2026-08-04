import { describe, expect, it } from "vitest";

import { buildToolResultContent, MAX_PERSISTED_TOOL_RESULT_CHARS } from "./toolResultMessage";

/**
 * The cap is at the choke point and unconditional, because most tools have no
 * cap of their own: only `tools/github.ts` and `tools/dropbox.ts` bound their
 * responses, so a gmail or googleDrive payload arrives here unbounded. These
 * tests assert the bound holds regardless of which tool produced the result, and
 * that a payload under it is passed through untouched.
 *
 * They also pin how the budget is divided. It is shared per entry, so an
 * oversized data-fetch result cannot evict the small display result that ran
 * after it — the row is the clients' only source for rehydrating display cards.
 */

const HEADER = "[Tool Execution Results]\n\n";
const MARKER_PATTERN = /\n\n\.\.\. \(tool output truncated, (\d+) characters omitted\)/;

/** A result whose JSON body lands just over/under the cap by `delta` chars. */
function resultOfBodyLength(name: string, bodyChars: number): { name: string; result: string } {
  // JSON.stringify wraps a string in quotes, and the per-result framing adds the
  // `Tool "<name>" returned: ` prefix — size the payload so the assembled summary
  // is exactly `bodyChars` long.
  const framing = `Tool "${name}" returned: ""`.length;
  return { name, result: "x".repeat(bodyChars - framing) };
}

/**
 * What a provider that caps itself actually hands back: `truncate` in
 * `tools/github.ts` returns up to `MAX_RESPONSE_SIZE` (100_000) *plus* its own
 * marker, so a maxed response is already over the outer ceiling on its own.
 */
function maxedProviderResponse(): string {
  return `${"x".repeat(100_000)}\n\n... (truncated, 48213 characters omitted)`;
}

/** The regex the clients use to rehydrate display cards off the persisted row. */
const DISPLAY_TOOL_REGEX = /Tool "display_(\w+)" returned: (.+)/g;

describe("buildToolResultContent", () => {
  it("leaves a payload under the cap untouched", () => {
    const content = buildToolResultContent([{ name: "gmail_search", result: { id: "abc" } }]);

    expect(content).toBe(
      '[Tool Execution Results]\n\nTool "gmail_search" returned: {"id":"abc"}\n\nBased on these results, continue with the task.'
    );
    expect(content).not.toContain("truncated");
  });

  it("truncates a payload over the cap and says how much was dropped", () => {
    const entryChars = MAX_PERSISTED_TOOL_RESULT_CHARS + 5_000;
    const content = buildToolResultContent([resultOfBodyLength("googleDrive_search", entryChars)]);

    // The count has to describe what was dropped from this entry, so check it
    // against how much of the entry actually survived. A fixed number would only
    // pin the framing arithmetic, which the ceiling now has to pay for too.
    const marker = MARKER_PATTERN.exec(content);
    expect(marker).not.toBeNull();
    const kept = content.indexOf("\n\n... (tool output truncated,") - HEADER.length;
    expect(kept + Number(marker?.[1])).toBe(entryChars);
    expect(content.length).toBeLessThanOrEqual(MAX_PERSISTED_TOOL_RESULT_CHARS);
  });

  it("keeps the framing intact when it truncates", () => {
    // The row is replayed to the model on later turns, so the header and the
    // trailing instruction must survive — only the tool output gets cut.
    const content = buildToolResultContent([
      resultOfBodyLength("notion_search", MAX_PERSISTED_TOOL_RESULT_CHARS * 2),
    ]);

    expect(content.startsWith("[Tool Execution Results]\n\n")).toBe(true);
    expect(content.endsWith("\n\nBased on these results, continue with the task.")).toBe(true);
  });

  it("keeps the display entry when an earlier data fetch already fills the budget", () => {
    // Real ordering of a "read my issues and chart them" turn: the data fetch
    // runs first and returns a maxed payload, the display tool runs last and is
    // tiny. Capping the concatenation is first-come-first-served, so the display
    // entry is evicted whole — and this row is the only copy of the chart
    // payload, the one the clients parse back to rehydrate the card on reload.
    const content = buildToolResultContent([
      { name: "github_api", result: maxedProviderResponse() },
      {
        name: "display_chart",
        result: { displayType: "chart", data: [{ label: "bug", value: 12 }] },
      },
    ]);

    const matches = [...content.matchAll(DISPLAY_TOOL_REGEX)];
    expect(matches).toHaveLength(1);
    // Not just present: still parseable, which is what the clients do with it.
    expect(JSON.parse(matches[0][2])).toEqual({
      displayType: "chart",
      data: [{ label: "bug", value: 12 }],
    });
    expect(content).toContain("tool output truncated");
    expect(content.length).toBeLessThanOrEqual(MAX_PERSISTED_TOOL_RESULT_CHARS);
  });

  it("caps the combined size of many results, not each one", () => {
    // A single tool called repeatedly is how the oversized rows were actually
    // produced (the model re-fetching after a truncated response), so the bound
    // has to apply to the assembled summary.
    const each = MAX_PERSISTED_TOOL_RESULT_CHARS / 2;
    const content = buildToolResultContent([
      resultOfBodyLength("x_search", each),
      resultOfBodyLength("x_search", each),
      resultOfBodyLength("x_search", each),
    ]);

    expect(content).toContain("tool output truncated");
    expect(content.length).toBeLessThanOrEqual(MAX_PERSISTED_TOOL_RESULT_CHARS);
    // Shared budget, so each one keeps a slice and each slice carries its own
    // marker instead of one marker stranded at the end of the last entry.
    expect(content.match(/tool output truncated/g)).toHaveLength(3);
  });

  it("leaves small results completely untouched", () => {
    const results = [
      { name: "gmail_search", result: { id: "a" } },
      { name: "display_chart", result: { displayType: "chart", data: [1, 2] } },
      { name: "notion_search", result: { id: "b" } },
    ];

    const content = buildToolResultContent(results);

    expect(content).not.toContain("truncated");
    for (const result of results) {
      expect(content).toContain(`Tool "${result.name}" returned: ${JSON.stringify(result.result)}`);
    }
  });

  it("holds the ceiling when the results outnumber the budget", () => {
    // Enough entries that an equal share is smaller than a truncation marker,
    // which is the one case where an entry cannot carry a marker at all.
    const results = Array.from({ length: 3_000 }, (_, i) =>
      resultOfBodyLength("x_search", 200 + i)
    );

    expect(buildToolResultContent(results).length).toBeLessThanOrEqual(
      MAX_PERSISTED_TOOL_RESULT_CHARS
    );
  });

  it("cannot keep a display payload that is oversized on its own parseable", () => {
    // Naming the residual instead of hiding it: sharing the budget stops a
    // display entry being evicted by someone else's payload, but a display
    // payload that is over budget by itself is still cut mid-JSON, and the
    // clients' `JSON.parse` on the captured group then fails. Nothing this row
    // can do about that — the payload does not fit.
    const content = buildToolResultContent([
      {
        name: "display_chart",
        result: { displayType: "chart", data: "y".repeat(MAX_PERSISTED_TOOL_RESULT_CHARS) },
      },
    ]);

    const matches = [...content.matchAll(DISPLAY_TOOL_REGEX)];
    expect(matches).toHaveLength(1);
    expect(() => JSON.parse(matches[0][2])).toThrow();
  });
});
