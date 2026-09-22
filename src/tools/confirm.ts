/**
 * Confirmation interaction tool factory.
 *
 * Creates a client-side tool that shows the user exactly what is about to
 * happen and blocks until they answer. Built for actions that are expensive to
 * undo — spending money, holding a table against someone's card — where the
 * model's own belief that the user agreed is not good enough.
 *
 * ## What the result is for
 *
 * The portal gates the action on this tool's result: it refuses the acting tool
 * unless a completed confirmation for the same thing is already in the turn. A
 * bare `{ confirmed: true }` would not survive that, because the model writes
 * the acting tool's arguments and could equally write a boolean that says the
 * user agreed. So the result carries **the parameters themselves**, and the
 * portal compares them against the acting tool's arguments field by field.
 *
 * The chain that makes it verifiable:
 *
 * 1. The model writes `action` and `parameters` as tool arguments.
 * 2. The card renders those same values — not a paraphrase of them.
 * 3. The user answers the card, and the SDK (not the model) builds the result.
 * 4. The portal compares the result's `parameters` to the acting tool's
 *    arguments, and refuses on any mismatch.
 *
 * A model that wants to book something other than what the user saw has to get
 * step 4 past a field-by-field comparison, which is why the values are plain
 * strings: two renderings of the same number must not read as a disagreement.
 *
 * ## The three outcomes
 *
 * | Outcome | Result |
 * |---|---|
 * | The user confirmed | `{ confirmed: true, action, parameters, answeredAt }` |
 * | The user declined | `{ confirmed: false, action, parameters, answeredAt }` |
 * | Timed out, cleared, or never shown | `{ cancelled: true }` |
 *
 * A decline is an ordinary answer, not a failure — the model should say so and
 * move on. Only the third row means nobody answered, and it is the shape every
 * interactive tool in this module already produces for that case.
 *
 * **The card must resolve the interaction for a decline, with
 * `{ confirmed: false }` — not cancel it.** Cancelling rejects the underlying
 * promise, which is indistinguishable from a timeout by the time it reaches
 * here, and a decline would then be reported as nobody having answered.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import type { CreateUIToolsOptions } from "./uiInteraction";
import { createInteractiveTool } from "./uiInteraction";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One field of the action being confirmed, as the card shows it. */
export type ConfirmParameter = {
  /** Machine-readable key, matched against the acting tool's argument name. */
  name: string;
  /** Display label for the field, e.g. "Party size". */
  label: string;
  /** The exact value being confirmed. A string, so comparison is unambiguous. */
  value: string;
};

/** What the tool returns once the user has answered. */
export type ConfirmToolResult = {
  /** True only when the user explicitly agreed. Anything else is a decline. */
  confirmed: boolean;
  /** The action that was confirmed, e.g. `book_restaurant`. */
  action: string;
  /** The parameters the card showed, verbatim — what the portal verifies. */
  parameters: ConfirmParameter[];
  /** ISO-8601 timestamp of the answer, for a server-side freshness window. */
  answeredAt: string;
};

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

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
    name: "prompt_user_confirm",
    description:
      "Ask the user to approve a specific action before it happens. Use before anything that spends money or is hard to undo, such as booking a restaurant table or placing an order. List every parameter of the action, with the exact values you are about to use — the user approves what this card shows, and nothing else. Returns whether they confirmed. Do not use for ordinary yes/no questions; use prompt_user_choice for those.",
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
        confirmLabel: {
          type: "string",
          description: "Label for the confirm button (default: 'Confirm')",
        },
        declineLabel: {
          type: "string",
          description: "Label for the decline button (default: 'Cancel')",
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
      // An action with no readable parameters is one the user cannot actually
      // judge, and one the portal has nothing to compare against.
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
    ): ConfirmToolResult => ({
      // Fails closed: only an explicit true is agreement, so a card that
      // resolves with an unexpected shape reads as a decline rather than as
      // permission to spend.
      confirmed: result.confirmed === true,
      // From the arguments rather than from the card's reply. The card was
      // handed these to render, so echoing them back would only create a
      // second copy that could disagree with what was on screen.
      action: args.action as string,
      parameters: args.parameters as ConfirmParameter[],
      answeredAt: new Date().toISOString(),
    }),
  });
}
