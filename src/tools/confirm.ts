import type { ToolConfig } from "../lib/chat/useChat/types.js";
import { CONFIRM_TOOL_NAME } from "./confirmConstants";
import type { CreateUIToolsOptions } from "./uiInteraction";
import { createInteractiveTool } from "./uiInteraction";

/** One field of the action being confirmed, as the card shows it. */
export type ConfirmParameter = {
  /** Machine-readable key, matched against the acting tool's argument name. */
  name: string;
  /** Display label for the field, e.g. "Party size". */
  label: string;
  /** The exact value being confirmed. A string, so comparison is unambiguous. */
  value: string;
};

/**
 * What the tool returns: the user's answer, or `{ cancelled: true }` when
 * nobody answered.
 */
export type ConfirmToolResult =
  | {
      /** True when the user agreed, false when they declined. */
      confirmed: boolean;
      /** The action that was confirmed, e.g. `book_restaurant`. */
      action: string;
      /** The parameters the card showed, verbatim — what the portal verifies. */
      parameters: ConfirmParameter[];
      /** ISO-8601 timestamp of the answer, for a server-side freshness window. */
      answeredAt: string;
    }
  | {
      /** Timed out, cleared, never shown, or the card replied without a decision. */
      cancelled: true;
    };

/**
 * Create a prompt_user_confirm tool that asks the user to approve an action.
 *
 * When the LLM calls this tool, it shows a summary card of exactly what is
 * about to happen. Execution blocks until the user confirms or declines.
 *
 * @example
 * ```typescript
 * import { createConfirmTool } from "@anuma/sdk/tools";
 *
 * const confirmTool = createConfirmTool({
 *   getContext: () => uiInteraction,
 *   getLastMessageId: () => lastMsgId,
 * });
 * ```
 */
export function createConfirmTool(options: CreateUIToolsOptions): ToolConfig {
  return createInteractiveTool(options, {
    name: CONFIRM_TOOL_NAME,
    description:
      "Ask the user to approve a specific action before it happens. Use before anything that spends money or is hard to undo, such as booking or cancelling a restaurant table, or placing an order. List every parameter of the action, with the exact values you are about to use — the user approves what this card shows, and nothing else. Returns whether they confirmed. Do not use for ordinary yes/no questions; use prompt_user_choice for those.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short heading naming the action, e.g. 'Confirm your reservation'",
        },
        description: {
          type: "string",
          description: "Optional extra context, e.g. the cancellation policy",
        },
        action: {
          type: "string",
          description:
            "Machine-readable id of the action being confirmed, matching the tool that will carry it out, e.g. 'book_restaurant'",
        },
        parameters: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Argument name of the acting tool, e.g. 'party_size'",
              },
              label: {
                type: "string",
                description: "Display label shown to the user, e.g. 'Party size'",
              },
              value: {
                type: "string",
                description:
                  "The exact value you will use, as a string. Not a paraphrase — this is what the user is agreeing to.",
              },
            },
            required: ["name", "label", "value"],
          },
          description:
            "Every parameter of the action, with the exact values. The user sees these and nothing else.",
        },
      },
      required: ["title", "action", "parameters"],
    },
    interactionType: "confirm",
    validate: (args: Record<string, unknown>) => {
      const { title, action, parameters } = args as {
        title?: unknown;
        action?: unknown;
        parameters?: unknown;
      };
      if (typeof title !== "string" || !title) return false;
      if (typeof action !== "string" || !action) return false;
      if (!Array.isArray(parameters) || parameters.length === 0) return false;
      return parameters.every((parameter: Partial<ConfirmParameter>) => {
        return (
          typeof parameter?.name === "string" &&
          !!parameter.name &&
          typeof parameter.label === "string" &&
          !!parameter.label &&
          typeof parameter.value === "string"
        );
      });
    },
    mapResult: (
      result: Record<string, unknown>,
      args: Record<string, unknown>
    ): ConfirmToolResult => {
      if (typeof result.confirmed !== "boolean") return { cancelled: true };
      return {
        confirmed: result.confirmed,
        action: args.action as string,
        parameters: args.parameters as ConfirmParameter[],
        answeredAt: new Date().toISOString(),
      };
    },
  });
}
