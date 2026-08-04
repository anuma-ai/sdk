/**
 * Replay rules for the `[Tool Execution Results]` row (#5519).
 *
 * The row is stored as `role: "user"`, so what it does on the WIRE is a separate question from whether
 * it is persisted. Verbatim it breaks alternation; dropped it costs the model everything the tools
 * returned; the display payload it may carry can be data the model was deliberately never given.
 */

import { describe, expect, it } from "vitest";

import {
  buildToolResultsContent,
  DISPLAY_CARD_PLACEHOLDER,
  foldToolResultsRows,
  isToolResultsRow,
  parseToolResultSegments,
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
  return row("user", buildToolResultsContent(results));
}

describe("isToolResultsRow", () => {
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
    const sdkRow = buildToolResultsContent([
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
