import { describe, expect, test } from "vitest";

import { createGitHubTools } from "../../tools/github.js";
import { createGmailTools } from "../../tools/gmail.js";
import { createChatTools as createCalendarTools } from "../../tools/googleCalendar.js";
import { createDriveTools } from "../../tools/googleDrive.js";
import { createNotionTools } from "../../tools/notion.js";
import { BUILT_IN_TOOL_SETS } from "./serverTools.js";
import { buildDeniedToolsRider, TOOL_CATALOG } from "./toolCatalog.js";

const CONNECTOR_SET_NAMES = ["gmail", "google-calendar", "google-drive", "notion", "github"];

/**
 * Every tool name a connector factory actually exposes. Built by instantiating
 * the factories with throwaway stubs (we only read the tool names, never run
 * them) so the catalog is checked against the real source of truth, not a
 * hand-maintained list. Calendar/drive/notion/github factories return
 * `ToolConfig[]`; gmail returns a keyed record.
 */
function realConnectorToolNames(): Set<string> {
  const getToken = () => null;
  const request = async () => "";

  const names = new Set<string>(Object.keys(createGmailTools(request, request)));
  for (const tool of createCalendarTools(getToken, request)) names.add(tool.function.name);
  for (const tool of createDriveTools(getToken, request)) names.add(tool.function.name);
  for (const tool of createNotionTools(getToken, request)) names.add(tool.function.name);
  for (const tool of createGitHubTools(getToken, request)) names.add(tool.function.name);
  return names;
}

describe("TOOL_CATALOG drift guard", () => {
  test("every catalog key resolves to a real connector tool name", () => {
    const realNames = realConnectorToolNames();
    for (const name of Object.keys(TOOL_CATALOG)) {
      expect(realNames.has(name), `TOOL_CATALOG entry "${name}" is not a real tool`).toBe(true);
    }
  });

  test("every real connector tool has a catalog entry", () => {
    const realNames = realConnectorToolNames();
    expect(realNames.size).toBeGreaterThan(0);
    for (const name of realNames) {
      expect(TOOL_CATALOG[name], `real tool "${name}" is missing from TOOL_CATALOG`).toBeDefined();
    }
  });

  test("every connector tool-set member has a catalog entry", () => {
    const setMembers = BUILT_IN_TOOL_SETS.filter((set) =>
      CONNECTOR_SET_NAMES.includes(set.name)
    ).flatMap((set) => set.members);

    expect(setMembers.length).toBeGreaterThan(0);
    for (const name of setMembers) {
      expect(TOOL_CATALOG[name], `missing TOOL_CATALOG entry for "${name}"`).toBeDefined();
    }
  });
});

describe("buildDeniedToolsRider", () => {
  test("returns empty string for empty input", () => {
    expect(buildDeniedToolsRider([])).toBe("");
  });

  test("returns empty string when every name is unknown", () => {
    expect(buildDeniedToolsRider(["not_a_real_tool"])).toBe("");
  });

  test("names the label of a single denied tool", () => {
    const rider = buildDeniedToolsRider(["gmail_send_message"]);
    expect(rider).toContain("Send an email");
    expect(rider).toContain("Gmail");
  });

  test("groups denied tools by connector with sorted labels", () => {
    const rider = buildDeniedToolsRider([
      "gmail_send_message",
      "gmail_create_draft",
      "google_calendar_create_event",
    ]);
    expect(rider).toContain("Gmail: Draft a reply, Send an email");
    expect(rider).toContain("Calendar: Create calendar event");
  });

  test("produces identical output regardless of input order", () => {
    const a = buildDeniedToolsRider([
      "gmail_send_message",
      "google_calendar_create_event",
      "gmail_create_draft",
    ]);
    const b = buildDeniedToolsRider([
      "google_calendar_create_event",
      "gmail_create_draft",
      "gmail_send_message",
    ]);
    expect(a).toBe(b);
  });

  test("skips unknown names without throwing", () => {
    const rider = buildDeniedToolsRider(["nope", "gmail_send_message"]);
    expect(rider).toContain("Send an email");
    expect(rider).not.toContain("nope");
  });
});
