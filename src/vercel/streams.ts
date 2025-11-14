type AssistantStreamEvent =
  | { type: "text-start"; id: string }
  | { type: "text-delta"; id: string; delta: string }
  | { type: "text-end"; id: string }
  | { type: "error"; errorText: string };

/**
 * Creates a `ReadableStream` that emits the sequence of events expected by
 * Vercel's `createUIMessageStreamResponse` helper for a successful assistant reply.
 *
 * The stream emits `text-start`, an optional `text-delta` containing the
 * provided `text`, and finally `text-end`, allowing Portal completions to be
 * piped directly into UI components that consume the AI SDK stream contract.
 *
 * @param text The assistant response text returned by the Portal API.
 * @returns A stream ready to be passed to `createUIMessageStreamResponse`.
 */
export function createAssistantStream(
  text: string
): ReadableStream<AssistantStreamEvent> {
  const messageId = crypto.randomUUID();

  return new ReadableStream({
    start(controller) {
      controller.enqueue({
        type: "text-start",
        id: messageId,
      });

      if (text.length > 0) {
        controller.enqueue({
          type: "text-delta",
          id: messageId,
          delta: text,
        });
      }

      controller.enqueue({
        type: "text-end",
        id: messageId,
      });

      controller.close();
    },
  });
}

/**
 * Creates a `ReadableStream` that emits a single `error` event compatible
 * with the Vercel AI stream contract. This allows Portal API errors to be
 * surfaced directly in UI components that expect streamed assistant output.
 *
 * @param errorText A human-readable error message to display in the UI.
 * @returns A stream that, when consumed, immediately emits the error event.
 */
export function createErrorStream(
  errorText: string
): ReadableStream<AssistantStreamEvent> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue({
        type: "error",
        errorText,
      });
      controller.close();
    },
  });
}
