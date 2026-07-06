import { describe, expect, test } from "vitest";

import { createDropboxTools } from "../../tools/dropbox.js";
import { createGitHubTools } from "../../tools/github.js";
import { createGmailTools } from "../../tools/gmail.js";
import { createChatTools as createCalendarTools } from "../../tools/googleCalendar.js";
import { createDriveTools } from "../../tools/googleDrive.js";
import { createNotionTools } from "../../tools/notion.js";
import { createSlackTools } from "../../tools/slack.js";
import { createXTools } from "../../tools/x.js";
import type { ToolConfig } from "../chat/useChat/types.js";
import { BUILT_IN_TOOL_SETS } from "./serverTools.js";
import { buildConnectorGuidance, buildDeniedToolsRider, TOOL_CATALOG } from "./toolCatalog.js";

const CONNECTOR_SET_NAMES = [
  "gmail",
  "google-calendar",
  "google-drive",
  "notion",
  "github",
  "x",
  "slack",
  "dropbox",
];

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
  for (const tool of Object.values(createXTools(async () => null)))
    names.add((tool as { function: { name: string } }).function.name);
  for (const tool of Object.values(createSlackTools(async () => ({ status: 200, json: null }))))
    names.add((tool as { function: { name: string } }).function.name);
  for (const tool of Object.values(createDropboxTools(request, request)))
    names.add((tool as { function: { name: string } }).function.name);
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

function fakeTool(name: string): ToolConfig {
  return { type: "function", function: { name, description: "", parameters: {} } };
}

function names(tools: ToolConfig[]): string[] {
  return tools.map((t) => (t as { function: { name: string } }).function.name);
}

const ALL_PROVIDERS = ["gmail", "gcalendar", "gdrive", "notion", "github", "x", "slack", "dropbox"];

describe("buildConnectorGuidance", () => {
  test("removes denied tools from the returned set", () => {
    const { tools } = buildConnectorGuidance({
      tools: [fakeTool("gmail_search_messages"), fakeTool("gmail_send_message")],
      connectedProviders: ["gmail"],
      deniedToolNames: ["gmail_send_message"],
    });
    expect(names(tools)).toEqual(["gmail_search_messages"]);
  });

  test("state 1: names denied labels under the right connector", () => {
    const { rider } = buildConnectorGuidance({
      tools: [],
      connectedProviders: ["gmail"],
      deniedToolNames: ["gmail_send_message", "gmail_create_draft"],
    });
    expect(rider).toContain("On Gmail, these are turned off: Draft a reply, Send an email.");
    expect(rider).toContain("re-enable it in Connected Apps");
  });

  test("state 3: lists catalog connectors the user has not connected", () => {
    const { rider } = buildConnectorGuidance({
      tools: [],
      connectedProviders: ["gmail"],
      deniedToolNames: [],
    });
    expect(rider).toContain("Not connected: Calendar, Drive, Dropbox, GitHub, Notion, Slack, X.");
    expect(rider).toContain("connect them in Connected Apps");
  });

  test("denied tool on an unconnected provider is not double-reported as turned off", () => {
    const { rider } = buildConnectorGuidance({
      tools: [],
      connectedProviders: ["gmail"],
      deniedToolNames: ["notion-search"],
    });
    // Notion isn't connected → it belongs in state 3, not state 1.
    expect(rider).not.toContain("On Notion, these are turned off");
    expect(rider).toContain("Not connected:");
    expect(rider).toContain("Notion");
  });

  test("produces identical rider regardless of input order", () => {
    const a = buildConnectorGuidance({
      tools: [],
      connectedProviders: ["gmail", "notion"],
      deniedToolNames: ["gmail_send_message", "notion-update-page"],
    }).rider;
    const b = buildConnectorGuidance({
      tools: [],
      connectedProviders: ["notion", "gmail"],
      deniedToolNames: ["notion-update-page", "gmail_send_message"],
    }).rider;
    expect(a).toBe(b);
  });

  test("nothing connected → state-3 list only, no general line", () => {
    const { rider } = buildConnectorGuidance({
      tools: [],
      connectedProviders: [],
      deniedToolNames: [],
    });
    // Every catalog provider is unconnected, so state 3 is actionable; the
    // general line is suppressed because there's no connected app to disown.
    expect(rider).toBe(
      "Not connected: Calendar, Drive, Dropbox, GitHub, Gmail, Notion, Slack, X. If the user asks to use them, tell them to connect them in Connected Apps."
    );
  });

  test("every provider connected and nothing denied → empty rider", () => {
    const { rider } = buildConnectorGuidance({
      tools: [],
      connectedProviders: ALL_PROVIDERS,
      deniedToolNames: [],
    });
    expect(rider).toBe("");
  });

  test("general line rides along when a denied section is present", () => {
    const { rider } = buildConnectorGuidance({
      tools: [],
      connectedProviders: ALL_PROVIDERS,
      deniedToolNames: ["gmail_send_message"],
    });
    expect(rider).toContain("On Gmail, these are turned off: Send an email.");
    expect(rider).toContain("Never tell the user you lack access to a connected app");
  });

  test("a denied name not in the catalog is skipped safely", () => {
    const { tools, rider } = buildConnectorGuidance({
      tools: [fakeTool("gmail_search_messages")],
      connectedProviders: ALL_PROVIDERS,
      deniedToolNames: ["totally_made_up_tool"],
    });
    expect(names(tools)).toEqual(["gmail_search_messages"]);
    expect(rider).not.toContain("turned off");
  });
});
