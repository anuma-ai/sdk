import type { LlmapiMessage } from "../../client";

/**
 * Assemble messages for an API request, ensuring system messages from the
 * caller appear before conversation history. The Responses API requires
 * system messages to precede all user/assistant messages.
 *
 * Order: [summarySystemMessage?, callerSystemMessages, historyMessages, callerNonSystemMessages]
 */
export function assembleMessagesWithHistory(
  historyMessages: LlmapiMessage[],
  callerMessages: LlmapiMessage[],
  summarySystemMessage?: LlmapiMessage | null
): LlmapiMessage[] {
  const systemMessages = callerMessages.filter((m) => m.role === "system");
  const nonSystemMessages = callerMessages.filter((m) => m.role !== "system");

  return [
    ...(summarySystemMessage ? [summarySystemMessage] : []),
    ...systemMessages,
    ...historyMessages,
    ...nonSystemMessages,
  ];
}
