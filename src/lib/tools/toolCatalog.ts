import type { ToolConfig } from "../chat/useChat/types.js";

interface ToolCatalogEntry {
  label: string;
  /** Canonical logical-provider id (e.g. "gmail", "gcalendar", "gdrive"). */
  provider: string;
  /** Human-facing connector display name (UI label). */
  connector: string;
}

export const TOOL_CATALOG: Record<string, ToolCatalogEntry> = {
  gmail_search_messages: { label: "Search emails", provider: "gmail", connector: "Gmail" },
  gmail_get_message: { label: "Read an email", provider: "gmail", connector: "Gmail" },
  gmail_create_draft: { label: "Draft a reply", provider: "gmail", connector: "Gmail" },
  gmail_send_message: { label: "Send an email", provider: "gmail", connector: "Gmail" },

  google_calendar_list_events: {
    label: "Search calendar events",
    provider: "gcalendar",
    connector: "Calendar",
  },
  google_calendar_create_event: {
    label: "Create calendar event",
    provider: "gcalendar",
    connector: "Calendar",
  },
  google_calendar_update_event: {
    label: "Update calendar event",
    provider: "gcalendar",
    connector: "Calendar",
  },

  google_drive_search: { label: "Search files", provider: "gdrive", connector: "Drive" },
  google_drive_list_recent: { label: "List recent files", provider: "gdrive", connector: "Drive" },
  google_drive_get_content: { label: "Read file content", provider: "gdrive", connector: "Drive" },
  google_drive_create_file: {
    label: "Create a file in Drive",
    provider: "gdrive",
    connector: "Drive",
  },
  google_drive_update_file: {
    label: "Update a Drive file",
    provider: "gdrive",
    connector: "Drive",
  },

  "notion-search": { label: "Search", provider: "notion", connector: "Notion" },
  "notion-fetch": { label: "Read page", provider: "notion", connector: "Notion" },
  "notion-create-pages": { label: "Create page", provider: "notion", connector: "Notion" },
  "notion-update-page": { label: "Update page", provider: "notion", connector: "Notion" },
  "notion-move-pages": { label: "Move pages", provider: "notion", connector: "Notion" },
  "notion-duplicate-page": { label: "Duplicate page", provider: "notion", connector: "Notion" },
  "notion-create-database": { label: "Create database", provider: "notion", connector: "Notion" },
  "notion-update-data-source": {
    label: "Update data source",
    provider: "notion",
    connector: "Notion",
  },
  "notion-create-comment": { label: "Add a comment", provider: "notion", connector: "Notion" },
  "notion-get-comments": { label: "Read comments", provider: "notion", connector: "Notion" },
  "notion-get-users": {
    label: "List workspace members",
    provider: "notion",
    connector: "Notion",
  },
  "notion-get-teams": { label: "List teamspaces", provider: "notion", connector: "Notion" },

  github_api: { label: "Use GitHub", provider: "github", connector: "GitHub" },
  github_get_authenticated_user: {
    label: "Read GitHub profile",
    provider: "github",
    connector: "GitHub",
  },

  x_get_me: { label: "Get my X profile", provider: "x", connector: "X" },
  x_get_my_posts: { label: "Read my recent posts", provider: "x", connector: "X" },

  dropbox_list_folders: { label: "List files", provider: "dropbox", connector: "Dropbox" },
  dropbox_get_file_content: {
    label: "Read file content",
    provider: "dropbox",
    connector: "Dropbox",
  },
  dropbox_search: { label: "Search files", provider: "dropbox", connector: "Dropbox" },

  slack_get_me: { label: "Get my Slack profile", provider: "slack", connector: "Slack" },
  slack_list_channels: { label: "List channels", provider: "slack", connector: "Slack" },
  slack_list_dms: { label: "List direct messages", provider: "slack", connector: "Slack" },
  slack_search_messages: { label: "Search messages", provider: "slack", connector: "Slack" },
  slack_list_users: { label: "List members", provider: "slack", connector: "Slack" },
  slack_get_channel_history: {
    label: "Read channel history",
    provider: "slack",
    connector: "Slack",
  },
  slack_get_thread_replies: {
    label: "Read thread replies",
    provider: "slack",
    connector: "Slack",
  },
  slack_post_message: { label: "Post a message", provider: "slack", connector: "Slack" },
};

/**
 * Build a system-prompt fragment telling the model which connector capabilities
 * the user has turned off, so it can give the specific "re-enable this tool"
 * message instead of a generic refusal.
 *
 * Unknown names (not in {@link TOOL_CATALOG}) are skipped. Returns `""` when the
 * input is empty or every name is unknown — callers append the result
 * conditionally, so an empty string is a no-op.
 */
export function buildDeniedToolsRider(deniedToolNames: Iterable<string>): string {
  const byConnector = new Map<string, string[]>();
  for (const name of deniedToolNames) {
    const entry = TOOL_CATALOG[name];
    if (!entry) continue;
    const labels = byConnector.get(entry.connector) ?? [];
    labels.push(entry.label);
    byConnector.set(entry.connector, labels);
  }

  if (byConnector.size === 0) return "";

  const groups = [...byConnector.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([connector, labels]) =>
        `- ${connector}: ${[...labels].sort((a, b) => a.localeCompare(b)).join(", ")}`
    )
    .join("\n");

  return [
    "The user has turned off the following connector capabilities:",
    groups,
    "If the user asks you to use one of these, do not attempt it. Tell them the specific capability is turned off and that they can re-enable that exact tool in their Connected Apps settings.",
  ].join("\n");
}

function toolName(tool: ToolConfig): string | undefined {
  const record = tool as Record<string, unknown>;
  const func = record.function as Record<string, unknown> | undefined;
  if (typeof func?.name === "string") return func.name;
  if (typeof record.name === "string") return record.name;
  return undefined;
}

function catalogConnectorsByProvider(): Map<string, string> {
  const byProvider = new Map<string, string>();
  for (const entry of Object.values(TOOL_CATALOG)) {
    byProvider.set(entry.provider, entry.connector);
  }
  return byProvider;
}

export interface ConnectorGuidanceInput {
  /** The candidate tools for this turn (the final assembled set). */
  tools: ToolConfig[];
  /**
   * Logical provider codes connected for the user — the same codes used as
   * {@link TOOL_CATALOG} `provider` values (e.g. "gmail", "gcalendar",
   * "gdrive", "notion", "github", "dropbox").
   */
  connectedProviders: string[];
  /** Exact SDK tool-name strings the user turned off ({@link TOOL_CATALOG} keys). */
  deniedToolNames: string[];
}

export interface ConnectorGuidance {
  /** `input.tools` with any denied tool removed (the helper owns filtering). */
  tools: ToolConfig[];
  /** Compact system-prompt block, or "" when there's nothing actionable. */
  rider: string;
}

/**
 * Single helper both web and mobile use so neither re-implements connector
 * tool filtering or the accuracy messaging. It enforces denial (drops denied
 * tools from the turn's toolset) AND builds a compact rider letting the model
 * give an accurate message for each connector state instead of a generic
 * "I don't have access":
 *
 * 1. Toggled off — connected provider whose tool is denied → "turned off,
 *    re-enable in Connected Apps".
 * 2a. Pruned / 2b. no tool — covered by a general line telling the model not to
 *    claim no-access for a connected app. It rides along only when another
 *    section is present (on its own it isn't actionable).
 * 3. Not connected — catalog provider absent from `connectedProviders` →
 *    "connect it in Connected Apps".
 *
 * State 3 is derived from {@link TOOL_CATALOG}'s provider set — providers with
 * no tools (e.g. Disconnect-only Dropbox) aren't actionable via tools, so they
 * aren't surfaced here. Everything is sorted alphabetically for deterministic
 * output (no cache / snapshot churn). `rider` is "" when nothing is actionable
 * (every catalog provider connected and nothing denied).
 */
export function buildConnectorGuidance(input: ConnectorGuidanceInput): ConnectorGuidance {
  const denied = new Set(input.deniedToolNames);
  const connected = new Set(input.connectedProviders);
  const tools = input.tools.filter((tool) => {
    const name = toolName(tool);
    return name === undefined || !denied.has(name);
  });

  const deniedByConnector = new Map<string, string[]>();
  for (const name of denied) {
    const entry = TOOL_CATALOG[name];
    if (!entry || !connected.has(entry.provider)) continue;
    const labels = deniedByConnector.get(entry.connector) ?? [];
    labels.push(entry.label);
    deniedByConnector.set(entry.connector, labels);
  }

  const unconnected = new Set<string>();
  for (const [provider, connector] of catalogConnectorsByProvider()) {
    if (!connected.has(provider)) unconnected.add(connector);
  }

  const sections: string[] = [];

  if (deniedByConnector.size > 0) {
    const groups = [...deniedByConnector.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([connector, labels]) =>
          `On ${connector}, these are turned off: ${[...labels].sort((a, b) => a.localeCompare(b)).join(", ")}.`
      )
      .join("\n");
    sections.push(
      `${groups}\nIf the user asks to use one of these, tell them it's turned off and they can re-enable it in Connected Apps.`
    );
  }

  if (unconnected.size > 0) {
    const list = [...unconnected].sort((a, b) => a.localeCompare(b)).join(", ");
    sections.push(
      `Not connected: ${list}. If the user asks to use them, tell them to connect them in Connected Apps.`
    );
  }

  if (sections.length > 0 && connected.size > 0) {
    sections.push(
      "Never tell the user you lack access to a connected app; if you can't find a tool for a connected app's request, say that specific capability isn't available yet rather than that the app isn't connected."
    );
  }

  return { tools, rider: sections.join("\n\n") };
}
