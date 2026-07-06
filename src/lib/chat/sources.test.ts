import { describe, expect, it } from "vitest";

import { extractSourcesFromToolCallEvents } from "./sources.js";

describe("extractSourcesFromToolCallEvents", () => {
  it("returns [] for undefined / empty input", () => {
    expect(extractSourcesFromToolCallEvents(undefined)).toEqual([]);
    expect(extractSourcesFromToolCallEvents([])).toEqual([]);
  });

  it("extracts AnumaSearchMCP text_search results", () => {
    const events = [
      {
        id: "1",
        name: "AnumaSearchMCP-text_search",
        output: JSON.stringify({
          results: [
            { title: "Cavapoo care", url: "https://a.test/care", snippets: ["Brush weekly."] },
            { title: "Diet", url: "https://a.test/diet", snippets: ["Two meals a day."] },
          ],
        }),
      },
    ];
    const sources = extractSourcesFromToolCallEvents(events);
    expect(sources).toEqual([
      { title: "Cavapoo care", url: "https://a.test/care", snippet: "Brush weekly." },
      { title: "Diet", url: "https://a.test/diet", snippet: "Two meals a day." },
    ]);
  });

  it("dedupes by url across events", () => {
    const mk = (id: string) => ({
      id,
      name: "AnumaSearchMCP-text_search",
      output: JSON.stringify({
        results: [{ title: "T", url: "https://dup.test/x", snippets: [] }],
      }),
    });
    const sources = extractSourcesFromToolCallEvents([mk("1"), mk("2")]);
    expect(sources.map((s) => s.url)).toEqual(["https://dup.test/x"]);
  });

  it("ignores events with malformed JSON output (returns what it can)", () => {
    const events = [
      { id: "1", name: "AnumaSearchMCP-text_search", output: "{not json" },
      {
        id: "2",
        name: "AnumaSearchMCP-text_search",
        output: JSON.stringify({
          results: [{ title: "Ok", url: "https://ok.test", snippets: [] }],
        }),
      },
    ];
    expect(extractSourcesFromToolCallEvents(events).map((s) => s.url)).toEqual(["https://ok.test"]);
  });

  it("ignores non-search tool events", () => {
    const events = [
      {
        id: "1",
        name: "SomeOtherTool",
        output: JSON.stringify({ results: [{ url: "https://x" }] }),
      },
    ];
    expect(extractSourcesFromToolCallEvents(events)).toEqual([]);
  });
});
