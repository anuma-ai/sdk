/**
 * Choice interaction tool factory.
 *
 * Creates a client-side tool that presents an interactive choice picker
 * inline in the chat. The tool blocks until the user selects an option.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import type { CreateUIToolsOptions } from "./uiInteraction";
import { createInteractiveTool } from "./uiInteraction";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChoiceOption = {
  /** Unique identifier for this option */
  value: string;
  /** Display text for this option */
  label: string;
  /** Optional description or additional info */
  description?: string;
};

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

/**
 * Create a prompt_user_choice tool that renders an interactive choice picker.
 *
 * When the LLM calls this tool, it presents a set of options to the user
 * inline in the chat. Execution blocks until the user makes a selection,
 * then the result is returned to the LLM.
 *
 * @example
 * ```typescript
 * import { createChoiceTool } from "@anuma/sdk/tools";
 *
 * const choiceTool = createChoiceTool({
 *   getContext: () => uiInteraction,
 *   getLastMessageId: () => lastMsgId,
 * });
 * ```
 */
export function createChoiceTool(options: CreateUIToolsOptions): ToolConfig {
  return createInteractiveTool(options, {
    name: "prompt_user_choice",
    description:
      "Renders an interactive inline menu the user can click to pick from choices. Use when the user's request naturally involves selecting between specific, concrete options — for example picking a restaurant, choosing a travel destination, or selecting a category. Call this tool FIRST before generating any response text. After the user selects, you receive their choice and can respond based on it.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Question or prompt to show the user",
        },
        description: {
          type: "string",
          description: "Optional additional context or explanation",
        },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              value: {
                type: "string",
                description: "Unique identifier for this option",
              },
              label: {
                type: "string",
                description: "Display text for this option",
              },
              description: {
                type: "string",
                description: "Optional description or additional info",
              },
            },
            required: ["value", "label"],
          },
          description: "Array of options to present (minimum 2, maximum 10 recommended)",
        },
        allowMultiple: {
          type: "boolean",
          description: "Allow user to select multiple options (default: false)",
          default: false,
        },
      },
      required: ["title", "options"],
    },
    interactionType: "choice",
    validate: (args: Record<string, unknown>) => {
      const { title, options } = args as {
        title?: unknown;
        options?: { value: unknown; label: unknown }[];
      };
      return (
        !!title &&
        typeof title === "string" &&
        Array.isArray(options) &&
        options.length >= 2 &&
        options.every((o) => o.value && o.label)
      );
    },
    mapResult: (result: Record<string, unknown>, args: Record<string, unknown>) => ({
      ...result,
      _meta: {
        title: args.title as string,
        description: args.description as string | undefined,
        options: args.options as ChoiceOption[],
        allowMultiple: args.allowMultiple as boolean | undefined,
      },
    }),
  });
}
