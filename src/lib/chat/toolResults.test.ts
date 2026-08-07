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
  MAX_FOLDED_APPENDIX_CHARS,
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

describe("foldToolResultsRows — review findings (#868)", () => {
  it("keeps a truncated entry's marker, so the model is told the output was cut", () => {
    // kingpinXD: #866 appends its marker INSIDE an entry, so a capped entry spans several lines. A
    // one-line-per-entry parser dropped the marker and handed the model JSON cut mid-value with
    // nothing saying so.
    const truncatedRow = row(
      "user",
      `${TOOL_RESULTS_PREFIX}\n\nTool "github_api" returned: {"a":"bbb\n\n... (tool output truncated, 4210 characters omitted)\n\nBased on these results, continue with the task.`
    );

    const segments = parseToolResultSegments(truncatedRow.content);
    expect(segments).toHaveLength(1);
    expect(segments[0]!.line).toContain("tool output truncated, 4210 characters omitted");
    // The row's own footer belongs to the row, not to the last entry.
    expect(segments[0]!.line).not.toContain("continue with the task");

    // …and it survives the fold, which is where it was being lost.
    const folded = foldToolResultsRows([row("assistant", "here you go"), truncatedRow]);
    expect(folded).toHaveLength(1);
    expect(folded[0]!.content).toContain("tool output truncated, 4210 characters omitted");
  });

  it("folds a legacy row parented to the USER prompt onto the following assistant", () => {
    // morde08: mobile's `buildSlideDisplayMessage` chained to "the preceding message", so rows
    // already in users' DBs sort before the assistant reply. Backwards-only search dropped them.
    const folded = foldToolResultsRows([
      { role: "user", content: "make me a deck", uniqueId: "u1" },
      { role: "user", content: `${TOOL_RESULTS_PREFIX}\nTool "display_slides" returned: {"n":1}` },
      { role: "assistant", content: "Here it is.", uniqueId: "a1" },
    ]);

    expect(folded.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(folded[1]!.content).toContain('Tool "display_slides" returned:');
  });

  it("emits ONE appendix when two rows land on the same assistant", () => {
    // morde08: reachable during the mobile transition, when a legacy hand-rolled row and the new SDK
    // row coexist for one turn. Two blocks doubled the payload.
    const folded = foldToolResultsRows([
      { role: "user", content: "make both", uniqueId: "u1" },
      { role: "assistant", content: "here you go", uniqueId: "a1" },
      {
        role: "user",
        content: `${TOOL_RESULTS_PREFIX}\nTool "display_slides" returned: {"n":1}`,
        parentMessageId: "a1",
      },
      {
        role: "user",
        content: `${TOOL_RESULTS_PREFIX}\nTool "display_document" returned: {"n":2}`,
        parentMessageId: "a1",
      },
    ]);

    expect(folded).toHaveLength(2);
    const blocks = folded[1]!.content.split(TOOL_RESULTS_PREFIX).length - 1;
    expect(blocks).toBe(1);
    expect(folded[1]!.content).toContain('Tool "display_slides" returned:');
    expect(folded[1]!.content).toContain('Tool "display_document" returned:');
  });

  it("caps the appendix, and the cap does not evict the small display entry", () => {
    // morde08: `plan_deck + add_slide × 20` folds tens of KB onto one message, re-sent every turn.
    // Water-filling is what keeps a small display payload alive beside an oversized one.
    const huge = `Tool "plan_deck" returned: {"jsx":"${"x".repeat(40_000)}"}`;
    const small = 'Tool "display_slides" returned: {"interaction_id":"s1"}';
    const folded = foldToolResultsRows([
      { role: "assistant", content: "done", uniqueId: "a1" },
      {
        role: "user",
        content: `${TOOL_RESULTS_PREFIX}\n${huge}\n${small}`,
        parentMessageId: "a1",
      },
    ]);

    expect(folded[1] ?? folded[0]!).toBeDefined();
    const content = folded[0]!.content;
    expect(content.length).toBeLessThanOrEqual(MAX_FOLDED_APPENDIX_CHARS + "done\n\n".length + 8);
    // The identifying field a follow-up needs survives.
    expect(content).toContain('"interaction_id":"s1"');
    expect(content).toContain("tool output truncated");
  });
});

describe("isToolResultsRow — origin settles what shape cannot", () => {
  it("keeps a pasted tool-shaped user turn when origin says it is not synthetic", () => {
    // greptile: a user CAN paste the prefix plus a well-formed tool line, and no amount of content
    // inspection can tell that from a real synthetic. The v44 column is what settles it — a composer
    // message is written without `origin: "tool_result"`.
    const pasted = {
      role: "user",
      content: `${TOOL_RESULTS_PREFIX}\nTool "github_api" returned: {"why":"does this show up?"}`,
      origin: null,
    };
    // Shape alone still says "synthetic" — that is the documented pre-v44 limit.
    expect(isToolResultsRow(pasted)).toBe(true);

    // But once the SDK stamps provenance, the guess is never consulted.
    expect(isToolResultsRow({ ...pasted, origin: "user_message" })).toBe(false);
    expect(
      foldToolResultsRows([row("assistant", "Sure."), { ...pasted, origin: "user_message" }])
    ).toHaveLength(2);
  });

  it("trusts origin even when capping left no parseable tool line", () => {
    expect(
      isToolResultsRow({ role: "user", content: TOOL_RESULTS_PREFIX, origin: "tool_result" })
    ).toBe(true);
  });

  it("does not hide a 'chunks_discarded' row (client#5618)", () => {
    // `origin` is an enum now, not a boolean, and only `tool_result` hides a row.
    // The discard sweep marks ~2k ORDINARY user and assistant messages with
    // `chunks_discarded` to stop them being re-embedded; if this predicate ever
    // widened to "has a non-null origin", every one of them would vanish from
    // the transcript while still sitting in the database and in backup. That is
    // silent, user-visible history loss, so pin it rather than leave it as a
    // property that happens to fall out of the early return below.
    expect(
      isToolResultsRow({ role: "user", content: "What did you mean by that?", origin: null })
    ).toBe(false);
    expect(
      isToolResultsRow({
        role: "user",
        content: "What did you mean by that?",
        origin: "chunks_discarded",
      })
    ).toBe(false);
    expect(
      isToolResultsRow({
        role: "assistant",
        content: "I meant the second option.",
        origin: "chunks_discarded",
      })
    ).toBe(false);

    // Even for a row whose CONTENT looks synthetic: the marker is a positive
    // statement that this is not a tool-results row, so shape must not override.
    expect(
      isToolResultsRow({
        role: "user",
        content: `${TOOL_RESULTS_PREFIX}\nTool "github_api" returned: {"a":1}`,
        origin: "chunks_discarded",
      })
    ).toBe(false);

    // Control: the value that DOES hide a row still hides it.
    expect(isToolResultsRow({ role: "user", content: "anything", origin: "tool_result" })).toBe(
      true
    );
  });
});

describe("resolveFoldTarget — nearest assistant, not a fixed direction", () => {
  const deckLine = 'Tool "display_slides" returned: {"n":1}';

  it("attributes a legacy row to ITS turn's reply, not the previous turn's", () => {
    // kingpinXD: backwards-first found `a0` before it ever looked forward, so from turn two onward the
    // payload was credited to the turn before the one that produced it — worse than dropping it.
    const folded = foldToolResultsRows([
      row("user", "hello"),
      { role: "assistant", content: "TURN-ONE-REPLY", uniqueId: "a0" },
      row("user", "make me a deck"),
      row("user", `${TOOL_RESULTS_PREFIX}\n${deckLine}`),
      { role: "assistant", content: "TURN-TWO-REPLY", uniqueId: "a1" },
    ]);

    const [, turnOne, , turnTwo] = folded;
    expect(turnOne!.content).toBe("TURN-ONE-REPLY");
    expect(turnOne!.content).not.toContain("display_slides");
    expect(turnTwo!.content).toContain("TURN-TWO-REPLY");
    expect(turnTwo!.content).toContain("display_slides");
  });

  it("still folds backwards for a parentless row that FOLLOWS its assistant", () => {
    // The reverse case, and why searching forward first is not the fix either: `a1` is a turn that has
    // not happened yet at the point the row was written.
    const folded = foldToolResultsRows([
      { role: "assistant", content: "TURN-ONE-REPLY", uniqueId: "a0" },
      row("user", `${TOOL_RESULTS_PREFIX}\n${deckLine}`),
      row("user", "and another"),
      { role: "assistant", content: "TURN-TWO-REPLY", uniqueId: "a1" },
    ]);

    expect(folded[0]!.content).toContain("display_slides");
    expect(folded[2]!.content).toBe("TURN-TWO-REPLY");
  });

  it("a resolvable parentMessageId still wins over both searches", () => {
    const folded = foldToolResultsRows([
      { role: "assistant", content: "NEARER", uniqueId: "a0" },
      { role: "user", content: `${TOOL_RESULTS_PREFIX}\n${deckLine}`, parentMessageId: "a1" },
      { role: "assistant", content: "LINKED", uniqueId: "a1" },
    ]);

    expect(folded[0]!.content).toBe("NEARER");
    expect(folded[1]!.content).toContain("display_slides");
  });
});
