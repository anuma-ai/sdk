import type { ToolConfig } from "./googleCalendar";
import type { CreateUIToolsOptions } from "./uiInteraction";
import { createDisplayTool } from "./uiInteraction";

const MAX_SUGGESTED_QUESTIONS = 3;

export type DisplayPhoneCallOfferResult =
  | {
      recipientName: string;
      phoneNumber: string;
      objective: string;
      suggestedQuestions?: string[];
      contextSummary?: string;
    }
  | {
      error: string;
    };

function isValidE164(phoneNumber: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phoneNumber);
}

function canNormalizePhoneNumber(phoneNumber: string): boolean {
  const trimmed = phoneNumber.trim();
  if (!trimmed) {
    return false;
  }

  if (isValidE164(trimmed)) {
    return true;
  }

  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");

  if (hasPlus) {
    return isValidE164(`+${digits}`);
  }

  if (digits.length === 10) {
    return isValidE164(`+1${digits}`);
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return isValidE164(`+${digits}`);
  }

  return false;
}

export function createPhoneCallOfferTool(options: CreateUIToolsOptions): ToolConfig {
  return createDisplayTool(options, {
    name: "display_phone_call_offer",
    description:
      "Render a phone call offer for a single business when you know their phone number and a call would help confirm reservation availability or product availability.",
    parameters: {
      type: "object",
      properties: {
        recipientName: {
          type: "string",
          description: "Name of the person or business the AI suggests calling.",
        },
        phoneNumber: {
          type: "string",
          description: "Callable phone number for the suggested recipient.",
        },
        objective: {
          type: "string",
          description:
            "What the call should confirm on the user's behalf, focused on reservation or product availability.",
        },
        suggestedQuestions: {
          type: "array",
          items: { type: "string" },
          description:
            "Optional list of up to three prewritten follow-up questions the user can choose from.",
        },
        contextSummary: {
          type: "string",
          description: "Optional context from the assistant's research to inform the call.",
        },
      },
      required: ["recipientName", "phoneNumber", "objective"],
    },
    displayType: "phone_call_offer",
    version: 1,
    execute: async (args: Record<string, unknown>): Promise<DisplayPhoneCallOfferResult> => {
      const recipientName = typeof args.recipientName === "string" ? args.recipientName.trim() : "";
      const phoneNumber = typeof args.phoneNumber === "string" ? args.phoneNumber.trim() : "";
      const objective = typeof args.objective === "string" ? args.objective.trim() : "";
      const suggestedQuestions = Array.isArray(args.suggestedQuestions)
        ? args.suggestedQuestions
            .filter((question): question is string => typeof question === "string")
            .map((question) => question.trim())
            .filter(Boolean)
        : undefined;
      const contextSummary =
        typeof args.contextSummary === "string" ? args.contextSummary.trim() : undefined;

      if (!recipientName) {
        return { error: "Missing recipient name for phone call offer" };
      }
      if (!phoneNumber) {
        return { error: "Missing phone number for phone call offer" };
      }
      if (!objective) {
        return { error: "Missing objective for phone call offer" };
      }
      if (!canNormalizePhoneNumber(phoneNumber)) {
        return { error: `Invalid phone number for phone call offer: ${phoneNumber}` };
      }
      if (suggestedQuestions && suggestedQuestions.length > MAX_SUGGESTED_QUESTIONS) {
        return {
          error: `Phone call offers support at most ${MAX_SUGGESTED_QUESTIONS} suggested questions`,
        };
      }

      return {
        recipientName,
        phoneNumber,
        objective,
        suggestedQuestions,
        contextSummary: contextSummary || undefined,
      };
    },
  });
}
