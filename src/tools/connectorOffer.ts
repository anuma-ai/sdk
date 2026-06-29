import type { ToolConfig } from "../lib/chat/useChat/types.js";
import type { CreateUIToolsOptions } from "./uiInteraction";
import { createDisplayTool } from "./uiInteraction";

export type DisplayConnectorResult =
  | {
      connectorId: string;
      reason?: string;
    }
  | {
      error: string;
    };

export function createConnectorOfferTool(options: CreateUIToolsOptions): ToolConfig {
  return createDisplayTool(options, {
    name: "display_connector",
    description:
      "Display an inline card that prompts the user to connect an app or service (for example Notion, Gmail, Google Drive, Google Calendar, GitHub, Dropbox). Call this when the user asks to connect, link, enable, or authorize one of these apps, or when answering their request requires access the user has not yet granted. The card renders the connect prompt visually; do NOT repeat the connection instructions in your text response.",
    parameters: {
      type: "object",
      properties: {
        connectorId: {
          type: "string",
          description:
            "The connector's id, e.g. 'notion', 'gmail', 'google-drive', 'google-calendar', 'github', 'dropbox'.",
        },
        reason: {
          type: "string",
          description: "Optional short reason this connector helps with the user's request.",
        },
      },
      required: ["connectorId"],
    },
    displayType: "connector",
    version: 1,
    execute: (args: Record<string, unknown>): DisplayConnectorResult => {
      const connectorId = typeof args.connectorId === "string" ? args.connectorId.trim() : "";
      const reason = typeof args.reason === "string" ? args.reason.trim() : undefined;

      if (!connectorId) {
        return { error: "Missing connector id for connector offer" };
      }

      return {
        connectorId,
        reason: reason || undefined,
      };
    },
  });
}
