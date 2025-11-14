import type { UIMessage } from "ai";
import type { LlmapiMessage } from "../client/types.gen";

/**
 * Converts an array of Vercel AI {@link UIMessage} objects into the
 * `LlmapiMessage` format that the Portal API expects.
 *
 * - Non text-only parts and unsupported roles are ignored.
 * - Text parts are merged with double newlines, matching the structure that
 *   `postApiV1ChatCompletions` accepts.
 *
 * @param messages The UI layer conversation history received from `createUIMessageStreamResponse`.
 * @returns A clean array of Portal-ready messages, filtered to user, assistant, and system roles.
 */
export function mapMessagesToCompletionPayload(
  messages: UIMessage[]
): LlmapiMessage[] {
  return messages
    .map((message) => {
      if (
        message.role !== "user" &&
        message.role !== "assistant" &&
        message.role !== "system"
      ) {
        return null;
      }

      const textParts = message.parts
        .map((part) => (part.type === "text" ? part.text : undefined))
        .filter((part): part is string => Boolean(part && part.trim()));

      const content = textParts.join("\n\n").trim();
      if (!content.length) return null;

      const llmMessage: LlmapiMessage = {
        role: message.role,
        content,
      };

      return llmMessage;
    })
    .filter((m): m is LlmapiMessage => m !== null);
}
