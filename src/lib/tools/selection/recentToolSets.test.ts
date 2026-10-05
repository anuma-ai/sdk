import type { Database } from "@nozbe/watermelondb";
import { beforeEach, describe, expect, it } from "vitest";

import { BUILT_IN_TOOL_SETS } from "../serverTools";
import { carriedToolSets, recordToolSetTurn, resetRecentToolSets } from "./recentToolSets";

const none = new Set<string>();

// The store only uses the database as an identity key.
const db = {} as Database;

describe("recentToolSets", () => {
  beforeEach(() => {
    resetRecentToolSets();
  });

  it("carries a matched connector set into the next two sends, then drops it", () => {
    recordToolSetTurn(db, "c1", new Set(["gmail"]));
    expect(carriedToolSets(db, "c1")).toEqual(["gmail"]);
    recordToolSetTurn(db, "c1", none);
    expect(carriedToolSets(db, "c1")).toEqual(["gmail"]);
    recordToolSetTurn(db, "c1", none);
    expect(carriedToolSets(db, "c1")).toEqual([]);
  });

  it("refreshes the carry when the set matches again", () => {
    recordToolSetTurn(db, "c1", new Set(["gmail"]));
    recordToolSetTurn(db, "c1", new Set(["gmail"]));
    recordToolSetTurn(db, "c1", none);
    expect(carriedToolSets(db, "c1")).toEqual(["gmail"]);
    recordToolSetTurn(db, "c1", none);
    expect(carriedToolSets(db, "c1")).toEqual([]);
  });

  it("decays on empty records", () => {
    recordToolSetTurn(db, "c1", new Set(["gmail"]));
    recordToolSetTurn(db, "c1", none);
    recordToolSetTurn(db, "c1", none);
    recordToolSetTurn(db, "c1", none);
    expect(carriedToolSets(db, "c1")).toEqual([]);
  });

  it("never carries a set whose anchors are not connector tools", () => {
    recordToolSetTurn(db, "c1", new Set(["app-generation"]));
    recordToolSetTurn(db, "c2", new Set(["documents"]));
    recordToolSetTurn(db, "c3", new Set(["restaurant-booking"]));
    expect(carriedToolSets(db, "c1")).toEqual([]);
    expect(carriedToolSets(db, "c2")).toEqual([]);
    expect(carriedToolSets(db, "c3")).toEqual([]);
  });

  it("carries connector sets", () => {
    recordToolSetTurn(db, "c1", new Set(["github", "notion", "slack"]));
    expect(carriedToolSets(db, "c1").sort()).toEqual(["github", "notion", "slack"]);
  });

  it("carries exactly the eight connector sets out of the built-in sets", () => {
    recordToolSetTurn(db, "c1", new Set(BUILT_IN_TOOL_SETS.map((s) => s.name)));
    expect(carriedToolSets(db, "c1").sort()).toEqual([
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
    recordToolSetTurn(db, "c1", new Set(["gmail"]));
    expect(carriedToolSets(db, "c2")).toEqual([]);
    recordToolSetTurn(db, "c2", none);
    expect(carriedToolSets(db, "c1")).toEqual(["gmail"]);
  });

  it("keeps the same conversation id apart in two databases", () => {
    const other = {} as Database;
    recordToolSetTurn(db, "c1", new Set(["gmail"]));
    expect(carriedToolSets(other, "c1")).toEqual([]);
    recordToolSetTurn(other, "c1", none);
    expect(carriedToolSets(db, "c1")).toEqual(["gmail"]);
  });

  it("ignores a missing conversation id", () => {
    recordToolSetTurn(db, null, new Set(["gmail"]));
    recordToolSetTurn(db, undefined, new Set(["gmail"]));
    expect(carriedToolSets(db, null)).toEqual([]);
    expect(carriedToolSets(db, undefined)).toEqual([]);
  });

  it("evicts the least recently used conversation past 50", () => {
    for (let i = 0; i < 50; i++) recordToolSetTurn(db, `c${i}`, new Set(["gmail"]));
    // Reading c0 makes c1 the least recently used.
    expect(carriedToolSets(db, "c0")).toEqual(["gmail"]);
    recordToolSetTurn(db, "c50", new Set(["gmail"]));
    expect(carriedToolSets(db, "c0")).toEqual(["gmail"]);
    expect(carriedToolSets(db, "c1")).toEqual([]);
    expect(carriedToolSets(db, "c2")).toEqual(["gmail"]);
    expect(carriedToolSets(db, "c50")).toEqual(["gmail"]);
  });
});
