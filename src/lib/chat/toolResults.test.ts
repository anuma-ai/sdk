/**
 * Replay rules for the `[Tool Execution Results]` row (#5519).
 *
 * The row is stored as `role: "user"`, so what it does on the WIRE is a separate question from whether
 * it is persisted. Verbatim it breaks alternation; dropped it costs the model everything the tools
 * returned; the display payload it may carry can be data the model was deliberately never given.
 */

import { describe, expect, it } from "vitest";

import { buildToolResultContent } from "./toolResultMessage";
import {
  DISPLAY_CARD_PLACEHOLDER,
  foldToolResultsRows,
  isToolResultsRow,
  parseToolResultSegments,
  prepareToolResultsForReplay,
  TOOL_RESULTS_PREFIX,
} from "./toolResults";

const searchResult = { rows_returned: 2, people: [{ display_name: "Ada" }] };
const cardResult = {
  people: [{ display_name: "Ada", lat: 1.5, lng: 2.5 }],
  displayType: "people_map",
};

function row(role: string, content: string) {
  return { role, content };
}

function toolRow(results: { name: string; result: unknown }[]) {
  return row("user", buildToolResultContent(results));
}

describe("isToolResultsRow", () => {
  it("does not classify a human message that merely starts with the prefix", () => {
    // Someone can paste the marker into the composer. Folding that into the previous assistant turn —
    // or dropping it — would delete what they actually said. A real synthetic always carries at least
    // one tool line.
    const typed = row("user", `${TOOL_RESULTS_PREFIX} what does this mean?`);
    expect(isToolResultsRow(typed)).toBe(false);
    expect(foldToolResultsRows([row("assistant", "Sure."), typed])).toEqual([
      row("assistant", "Sure."),
      typed,
    ]);
  });

  it("matches only a user row carrying the prefix", () => {
    expect(
      isToolResultsRow(toolRow([{ name: "search_people_nearby", result: searchResult }]))
    ).toBe(true);
    expect(isToolResultsRow(row("assistant", `${TOOL_RESULTS_PREFIX} means a tool ran`))).toBe(
      false
    );
    expect(isToolResultsRow(row("user", "what did the tool return?"))).toBe(false);
  });
});

describe("parseToolResultSegments", () => {
  it("reads one segment per tool, whichever newline style wrote the row", () => {
    const sdkRow = buildToolResultContent([
      { name: "search_people_nearby", result: searchResult },
      { name: "display_people_map", result: cardResult },
    ]);
    expect(parseToolResultSegments(sdkRow).map((s) => s.name)).toEqual([
      "search_people_nearby",
      "display_people_map",
    ]);

    // Mobile's hand-written document card uses single newlines.
    const clientRow = `${TOOL_RESULTS_PREFIX}\nTool "display_document" returned: {"documentId":"doc"}`;
    expect(parseToolResultSegments(clientRow).map((s) => s.name)).toEqual(["display_document"]);
  });

  it("ignores prose that merely mentions a tool", () => {
    expect(parseToolResultSegments("I called a tool and it returned nothing")).toEqual([]);
  });
});

describe("foldToolResultsRows", () => {
  it("folds the payload onto the preceding assistant turn instead of leaving a user row", () => {
    const folded = foldToolResultsRows([
      row("user", "find people near me"),
      row("assistant", "Found a few."),
      toolRow([{ name: "search_people_nearby", result: searchResult }]),
      row("user", "which of them likes chess"),
    ]);

    expect(folded.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    // The model can still resolve "them" after a reload — the whole point of folding rather than
    // dropping.
    expect(folded[1]!.content).toContain("Found a few.");
    expect(folded[1]!.content).toContain('Tool "search_people_nearby" returned:');
    expect(folded[1]!.content).toContain("Ada");
  });

  it("drops excluded tools' payloads entirely", () => {
    const folded = foldToolResultsRows(
      [
        row("user", "find people near me"),
        row("assistant", "Here they are."),
        toolRow([
          { name: "search_people_nearby", result: searchResult },
          { name: "display_people_map", result: cardResult },
        ]),
      ],
      { exclude: ["display_people_map"] }
    );

    expect(folded).toHaveLength(2);
    expect(folded[1]!.content).toContain('Tool "search_people_nearby" returned:');
    // The card's coordinates are the reason the exclusion exists.
    expect(folded[1]!.content).not.toContain("display_people_map");
    expect(folded[1]!.content).not.toContain("lat");
  });

  it("keeps an emptied assistant turn alive with the placeholder", () => {
    const folded = foldToolResultsRows(
      [
        row("user", "find people near me"),
        // The card WAS the visible reply, so the assistant row is stored empty.
        row("assistant", ""),
        toolRow([{ name: "display_people_map", result: cardResult }]),
        row("user", "message the second one"),
      ],
      { exclude: ["display_people_map"], placeholder: DISPLAY_CARD_PLACEHOLDER }
    );

    // Without the placeholder the empty assistant is dropped downstream for being empty, and the two
    // user turns collapse — which is how the new prompt gets swallowed.
    expect(folded.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(folded[1]!.content).toBe(DISPLAY_CARD_PLACEHOLDER);
  });

  it("leaves ordinary history untouched", () => {
    const rows = [row("user", "hi"), row("assistant", "hello")];
    expect(foldToolResultsRows(rows)).toEqual(rows);
  });

  it("discards a row with no assistant before it rather than emitting a bare user turn", () => {
    const folded = foldToolResultsRows([
      row("user", "find people near me"),
      toolRow([{ name: "search_people_nearby", result: searchResult }]),
    ]);
    expect(folded).toEqual([row("user", "find people near me")]);
  });

  it("preserves fields other than content (stored rows carry ids and fileIds)", () => {
    const assistant = { role: "assistant", content: "", uniqueId: "a1", fileIds: ["f1"] };
    const folded = foldToolResultsRows([
      { role: "user", content: "make a doc", uniqueId: "u1" },
      assistant,
      { ...toolRow([{ name: "create_document", result: { documentId: "doc" } }]), uniqueId: "t1" },
    ]);
    expect(folded[1]).toMatchObject({ uniqueId: "a1", fileIds: ["f1"] });
    // The document's id must survive replay: `patch_document` needs to name the file it just made.
    expect(folded[1]!.content).toContain('"documentId":"doc"');
  });
});

describe("foldToolResultsRows — link over position", () => {
  const searchLine = 'Tool "search_people_nearby" returned: {"rows_returned":2}';

  it("folds onto the assistant its parentMessageId names, whatever the row order", () => {
    // `created_at` is not unique and the two rows are written back to back, so history can hand the
    // tool-results row over BEFORE its assistant. Folding on position alone dropped the payload.
    const folded = foldToolResultsRows([
      { role: "user", content: "find people near me", uniqueId: "u1" },
      { role: "user", content: `${TOOL_RESULTS_PREFIX}\n${searchLine}`, parentMessageId: "a1" },
      { role: "assistant", content: "Found two.", uniqueId: "a1" },
    ]);

    expect(folded.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(folded[1]!.content).toContain("Found two.");
    expect(folded[1]!.content).toContain('Tool "search_people_nearby" returned:');
  });

  it("still folds a row that carries no parent, using position", () => {
    const folded = foldToolResultsRows([
      { role: "user", content: "write me a doc" },
      { role: "assistant", content: "" },
      {
        role: "user",
        content: `${TOOL_RESULTS_PREFIX}\nTool "display_document" returned: {"documentId":"d"}`,
      },
    ]);

    expect(folded).toHaveLength(2);
    expect(folded[1]!.content).toContain('"documentId":"d"');
  });

  it("drops a row whose parent assistant is outside the window", () => {
    const folded = foldToolResultsRows([
      { role: "user", content: "earlier prompt", uniqueId: "u9" },
      { role: "user", content: `${TOOL_RESULTS_PREFIX}\n${searchLine}`, parentMessageId: "a-gone" },
    ]);

    expect(folded).toEqual([{ role: "user", content: "earlier prompt", uniqueId: "u9" }]);
  });
});

describe("prepareToolResultsForReplay", () => {
  const history = [
    row("user", "find people near me"),
    row("assistant", "Found a few."),
    toolRow([
      { name: "search_people_nearby", result: searchResult },
      { name: "display_people_map", result: cardResult },
    ]),
    row("user", "which of them likes chess"),
  ];

  it("drops the rows when folding is off, so nothing rides on the assistant turn", () => {
    // The default. A caller whose own scrubbers key on `role === "user"` + prefix keeps working:
    // there is no folded payload for those filters to miss.
    const prepared = prepareToolResultsForReplay(history, { fold: false });

    expect(prepared.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(prepared[1]!.content).toBe("Found a few.");
    expect(prepared[1]!.content).not.toContain("Tool ");
    // The coordinates the card carries cannot reach the model on this branch even with no
    // `exclude` list configured — which is exactly why it is the default.
    expect(prepared.some((m) => m.content.includes("lat"))).toBe(false);
  });

  it("folds when the caller opts in, honouring exclude", () => {
    const prepared = prepareToolResultsForReplay(history, {
      fold: true,
      exclude: ["display_people_map"],
      placeholder: DISPLAY_CARD_PLACEHOLDER,
    });

    expect(prepared.map((m) => m.role)).toEqual(["user", "assistant", "user"]);
    expect(prepared[1]!.content).toContain('Tool "search_people_nearby" returned:');
    expect(prepared[1]!.content).not.toContain("lat");
  });

  it("never emits a bare tool-results row on either branch", () => {
    for (const fold of [true, false]) {
      const prepared = prepareToolResultsForReplay(history, { fold });
      expect(prepared.some((m) => isToolResultsRow(m))).toBe(false);
    }
  });
});
