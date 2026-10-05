import { beforeEach, describe, expect, it } from "vitest";

import { BUILT_IN_TOOL_SETS } from "../serverTools";
import { carriedToolSets, recordToolSetTurn, resetRecentToolSets } from "./recentToolSets";

const none = new Set<string>();

describe("recentToolSets", () => {
  beforeEach(() => {
    resetRecentToolSets();
  });

  it("carries a matched connector set into the next two sends, then drops it", () => {
    recordToolSetTurn("c1", new Set(["gmail"]));
    expect(carriedToolSets("c1")).toEqual(["gmail"]);
    recordToolSetTurn("c1", none);
    expect(carriedToolSets("c1")).toEqual(["gmail"]);
    recordToolSetTurn("c1", none);
    expect(carriedToolSets("c1")).toEqual([]);
  });

  it("refreshes the carry when the set matches again", () => {
    recordToolSetTurn("c1", new Set(["gmail"]));
    recordToolSetTurn("c1", new Set(["gmail"]));
    recordToolSetTurn("c1", none);
    expect(carriedToolSets("c1")).toEqual(["gmail"]);
    recordToolSetTurn("c1", none);
    expect(carriedToolSets("c1")).toEqual([]);
  });

  it("decays on empty records", () => {
    recordToolSetTurn("c1", new Set(["gmail"]));
    recordToolSetTurn("c1", none);
    recordToolSetTurn("c1", none);
    recordToolSetTurn("c1", none);
    expect(carriedToolSets("c1")).toEqual([]);
  });

  it("never carries a set whose anchors are not connector tools", () => {
    recordToolSetTurn("c1", new Set(["app-generation"]));
    recordToolSetTurn("c2", new Set(["documents"]));
    recordToolSetTurn("c3", new Set(["restaurant-booking"]));
    expect(carriedToolSets("c1")).toEqual([]);
    expect(carriedToolSets("c2")).toEqual([]);
    expect(carriedToolSets("c3")).toEqual([]);
  });

  it("carries connector sets", () => {
    recordToolSetTurn("c1", new Set(["github", "notion", "slack"]));
    expect(carriedToolSets("c1").sort()).toEqual(["github", "notion", "slack"]);
  });

  it("carries exactly the eight connector sets out of the built-in sets", () => {
    recordToolSetTurn("c1", new Set(BUILT_IN_TOOL_SETS.map((s) => s.name)));
    expect(carriedToolSets("c1").sort()).toEqual([
      "dropbox",
      "github",
      "gmail",
      "google-calendar",
      "google-drive",
      "notion",
      "slack",
      "x",
    ]);
  });

  it("keeps conversations apart", () => {
    recordToolSetTurn("c1", new Set(["gmail"]));
    expect(carriedToolSets("c2")).toEqual([]);
    recordToolSetTurn("c2", none);
    expect(carriedToolSets("c1")).toEqual(["gmail"]);
  });

  it("ignores a missing conversation id", () => {
    recordToolSetTurn(null, new Set(["gmail"]));
    recordToolSetTurn(undefined, new Set(["gmail"]));
    expect(carriedToolSets(null)).toEqual([]);
    expect(carriedToolSets(undefined)).toEqual([]);
  });

  it("evicts the least recently used conversation past 50", () => {
    for (let i = 0; i < 50; i++) recordToolSetTurn(`c${i}`, new Set(["gmail"]));
    // Reading c0 makes c1 the least recently used.
    expect(carriedToolSets("c0")).toEqual(["gmail"]);
    recordToolSetTurn("c50", new Set(["gmail"]));
    expect(carriedToolSets("c0")).toEqual(["gmail"]);
    expect(carriedToolSets("c1")).toEqual([]);
    expect(carriedToolSets("c2")).toEqual(["gmail"]);
    expect(carriedToolSets("c50")).toEqual(["gmail"]);
  });
});
