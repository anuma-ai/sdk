import type { ToolConfig } from "../lib/chat/useChat/types.js";
import { CONFIRM_TOOL_NAME, confirmRequirement, missingConfirmFields } from "./confirmConstants";
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
 * What the tool returns: the user's answer, `{ cancelled: true }` when nobody
 * answered, or `{ error }` when a restaurant card lacked a required field and
 * was never shown.
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
      /**
       * On an approved restaurant action: `confirmed_not_booked` or
       * `confirmed_not_cancelled`. Approval alone changes nothing.
       */
      status?: "confirmed_not_booked" | "confirmed_not_cancelled";
      /** On an approved restaurant action: the call that carries it out. */
      next_step?: string;
    }
  | {
      /** Why no card was shown, worded for the model. */
      error: string;
    }
  | {
      /** Timed out, cleared, never shown, or the card replied without a decision. */
      cancelled: true;
    };

function isWellFormedCard(args: Record<string, unknown>): boolean {
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
}

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
  const tool = createInteractiveTool(options, {
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
    validate: isWellFormedCard,
    mapResult: (
      result: Record<string, unknown>,
      args: Record<string, unknown>
    ): ConfirmToolResult => {
      if (typeof result.confirmed !== "boolean") return { cancelled: true };
      const requirement = result.confirmed ? confirmRequirement(args.action) : undefined;
      return {
        confirmed: result.confirmed,
        action: args.action as string,
        parameters: args.parameters as ConfirmParameter[],
        answeredAt: new Date().toISOString(),
        ...(requirement && {
          status: requirement.status,
          next_step: `call ${requirement.tool} now with these exact values`,
        }),
      };
    },
  });
  const showCard = tool.executor;
  return {
    ...tool,
    executor: (args: Record<string, unknown>, signal?: AbortSignal) => {
      const missing = missingConfirmFields(args.action, args.parameters);
      if (missing.length > 0) {
        return Promise.resolve({
          error: `card is missing ${missing.join(", ")}; look them up and call ${CONFIRM_TOOL_NAME} again with every field`,
        });
      }
      return showCard?.(args, signal);
    },
  };
}
