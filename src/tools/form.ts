/**
 * Form interaction tool factory.
 *
 * Creates a client-side tool that renders an interactive form inline in
 * the chat. The tool blocks until the user fills out and submits the form.
 */

import type { ToolConfig } from "../lib/chat/useChat/types.js";
import type { CreateUIToolsOptions } from "./uiInteraction";
import { createInteractiveTool } from "./uiInteraction";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FormFieldType = "text" | "textarea" | "select" | "toggle" | "date" | "slider";

export type FormFieldOption = {
  value: string;
  label: string;
};

export type FormField = {
  /** Unique field identifier (used as key in result) */
  name: string;
  /** Display label for the field */
  label: string;
  /** Field type */
  type: FormFieldType;
  /** Optional help text shown below the label */
  description?: string;
  /** Placeholder text for text/textarea/select fields */
  placeholder?: string;
  /** Options for select fields */
  options?: FormFieldOption[];
  /** Default value */
  defaultValue?: string | boolean | number;
  /** Minimum value for slider fields */
  min?: number;
  /** Maximum value for slider fields */
  max?: number;
  /** Step increment for slider fields */
  step?: number;
};

const VALID_FIELD_TYPES: FormFieldType[] = [
  "text",
  "textarea",
  "select",
  "toggle",
  "date",
  "slider",
];

// ---------------------------------------------------------------------------
// Tool factory
// ---------------------------------------------------------------------------

/**
 * Create a prompt_user_form tool that renders an interactive form.
 *
 * When the LLM calls this tool, it presents a form with various field types
 * to the user inline in the chat. Execution blocks until the user submits,
 * then all field values are returned to the LLM at once.
 *
 * @example
 * ```typescript
 * import { createFormTool } from "@anuma/sdk/tools";
 *
 * const formTool = createFormTool({
 *   getContext: () => uiInteraction,
 *   getLastMessageId: () => lastMsgId,
 * });
 * ```
 */
export function createFormTool(options: CreateUIToolsOptions): ToolConfig {
  return createInteractiveTool(options, {
    name: "prompt_user_form",
    description:
      "Renders an interactive inline form the user can fill out and submit. Use when you need to collect 2 or more specific pieces of structured information from the user — for example trip planning details (destination, dates, budget), booking info, or configuration settings. Supports text inputs, textareas, dropdowns (select), toggles, date pickers, and sliders. Call this tool FIRST before generating any response text. After the user submits, you receive all their answers at once.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Title or heading for the form",
        },
        description: {
          type: "string",
          description: "Optional instructions or context shown below the title",
        },
        fields: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Unique field identifier (used as key in result)",
              },
              label: {
                type: "string",
                description: "Display label for the field",
              },
              type: {
                type: "string",
                enum: VALID_FIELD_TYPES,
                description:
                  "Field type: text (single line), textarea (multi-line), select (dropdown), toggle (on/off), date (calendar picker), slider (numeric range)",
              },
              description: {
                type: "string",
                description: "Optional help text shown below the label",
              },
              placeholder: {
                type: "string",
                description: "Placeholder text for text/textarea/select fields",
              },
              options: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    value: { type: "string" },
                    label: { type: "string" },
                  },
                  required: ["value", "label"],
                },
                description: "Options for select fields",
              },
              defaultValue: {
                description:
                  "Default value for the field (string for text/textarea/select, boolean for toggle, number for slider)",
              },
              min: {
                type: "number",
                description: "Minimum value for slider fields (default: 0)",
              },
              max: {
                type: "number",
                description: "Maximum value for slider fields (default: 100)",
              },
              step: {
                type: "number",
                description: "Step increment for slider fields (default: 1)",
              },
            },
            required: ["name", "label", "type"],
          },
          description: "Array of form fields to display",
        },
      },
      required: ["title", "fields"],
    },
    interactionType: "form",
    validate: (args: Record<string, unknown>) => {
      const { title, fields } = args as {
        title?: unknown;
        fields?: { name: unknown; label: unknown; type: string; options?: unknown[] }[];
      };
      if (!title || typeof title !== "string") return false;
      if (!Array.isArray(fields) || fields.length === 0) return false;
      for (const field of fields) {
        if (!field.name || !field.label || !field.type) return false;
        if (!VALID_FIELD_TYPES.includes(field.type as FormFieldType)) return false;
        if (
          field.type === "select" &&
          (!Array.isArray(field.options) || field.options.length === 0)
        )
          return false;
      }
      return true;
    },
    mapResult: (result: Record<string, unknown>, args: Record<string, unknown>) => ({
      ...result,
      _meta: {
        title: args.title as string,
        description: args.description as string | undefined,
        fields: args.fields as FormField[],
      },
    }),
  });
}
