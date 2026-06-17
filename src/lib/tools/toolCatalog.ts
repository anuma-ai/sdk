/**
 * Connector tool catalog + denied-tools system-prompt rider.
 *
 * Granular connector access works by ALLOW/DENY-ing individual SDK tools.
 * Denying a tool means it's never handed to the model that turn, so it
 * physically can't be called — bypass-proof at the model layer.
 *
 * Consumer contract (this PR ships the foundation only — it does NOT wire
 * anything into runtime filtering or the client; those are later phases):
 *
 *   1. Hide the denied tools from the model — pass the denied tool names as
 *      `createServerToolsFilter({ excludeTools })` so they're dropped from the
 *      toolset before it reaches the LLM.
 *   2. Tell the user how to re-enable — append `buildDeniedToolsRider(denied)`
 *      to the system prompt. Because the tool is absent, the model can't name
 *      it on its own and would give a generic "I don't have access". The rider
 *      gives it the specific capability names (grouped by connector) so it can
 *      tell the user to re-enable that exact tool in Connected Apps settings.
 *
 * `TOOL_CATALOG` is the single source of truth for connector tool → friendly
 * label + provider. `provider` is the canonical logical-provider identifier the
 * portal and SDK already key on (matches `internal/oauth/providers.go` and the
 * `createConnectorTokenGetter` call sites) — Phase 2/3 use it to group and
 * persist per-tool denial. `connector` is the human-facing UI display string.
 * Consumers (portal, client) read this on a version bump rather than re-encoding
 * tool names. Labels are placeholders that will be refined later — keep them
 * sensible.
 */

interface ToolCatalogEntry {
  label: string;
  /** Canonical logical-provider id (e.g. "gmail", "gcalendar", "gdrive"). */
  provider: string;
  /** Human-facing connector display name (UI label). */
  connector: string;
}

export const TOOL_CATALOG: Record<string, ToolCatalogEntry> = {
  // Gmail (src/tools/gmail.ts)
  gmail_search_messages: { label: "Search emails", provider: "gmail", connector: "Gmail" },
  gmail_get_message: { label: "Read an email", provider: "gmail", connector: "Gmail" },
  gmail_create_draft: { label: "Draft a reply", provider: "gmail", connector: "Gmail" },
  gmail_send_message: { label: "Send an email", provider: "gmail", connector: "Gmail" },

  // Google Calendar (src/tools/googleCalendar.ts)
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

  // Google Drive (src/tools/googleDrive.ts)
  google_drive_search: { label: "Search files", provider: "gdrive", connector: "Drive" },
  google_drive_list_recent: { label: "List recent files", provider: "gdrive", connector: "Drive" },
  google_drive_get_content: { label: "Read file content", provider: "gdrive", connector: "Drive" },

  // Notion (src/tools/notion.ts)
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

  // GitHub (src/tools/github.ts)
  github_api: { label: "Use GitHub", provider: "github", connector: "GitHub" },
  github_get_authenticated_user: {
    label: "Read GitHub profile",
    provider: "github",
    connector: "GitHub",
  },
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

  // Sort connectors and the labels within each so the same denied set yields
  // identical text regardless of input order (avoids cache / snapshot churn).
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
