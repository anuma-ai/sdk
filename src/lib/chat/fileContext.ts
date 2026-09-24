import type { LlmapiMessage, LlmapiMessageContentPart } from "../../client";

/**
 * Opening tag of the text part that carries a turn's extracted attachment
 * contents. Consumers that read "the user's prompt" out of the last user
 * message (pre-processor routing, embeddings) must skip parts that start with
 * it — see {@link isAttachedFilesText}.
 */
export const ATTACHED_FILES_OPEN_TAG = "<attached_files>";
const ATTACHED_FILES_CLOSE_TAG = "</attached_files>";

/** True when a text part is the attachment-contents part built by {@link buildAttachedFilesText}. */
export function isAttachedFilesText(text: string | undefined | null): boolean {
  return typeof text === "string" && text.startsWith(ATTACHED_FILES_OPEN_TAG);
}

/**
 * Wrap a turn's extracted file contents (the `[Extracted content from <name>]`
 * blocks `preprocessFiles` emits) in the tagged part that rides on that turn's
 * user message.
 */
export function buildAttachedFilesText(fileContext: string): string {
  return (
    `${ATTACHED_FILES_OPEN_TAG}\n` +
    "The user attached the following file(s) to this message. Their extracted contents are below; " +
    'when the user refers to "the attached file", "this file" or "the document", they mean these.\n\n' +
    `${fileContext}\n${ATTACHED_FILES_CLOSE_TAG}`
  );
}

/**
 * Put the current turn's extracted attachment contents on the last user
 * message, as a text part placed after that message's own text parts (and
 * before any image parts).
 *
 * Why not a system message: a detached system message at the front of the
 * request ("the user has attached files to this conversation") is separated
 * from the words that refer to it by the whole system prompt, tool catalog and
 * history. In a long, multi-file conversation fast models stopped connecting
 * the two and told users the attachment was unreadable even though its text
 * was in the request. Keeping the contents on the turn that attached them is
 * how native file attachments work on every provider, and survives the auto
 * router switching models between turns.
 *
 * The part goes AFTER the user's own text because the portal's query
 * classifier routes on the first text part of the last user message — it must
 * keep reading the user's prompt, not the document.
 *
 * Returns a new array; the input is not mutated. When there is no user
 * message the messages are returned unchanged.
 */
export function attachFileContextToLastUserMessage(
  messages: LlmapiMessage[],
  fileContext: string
): LlmapiMessage[] {
  if (!fileContext.trim()) return messages;

  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      lastUserIndex = i;
      break;
    }
  }
  if (lastUserIndex === -1) return messages;

  const message = messages[lastUserIndex];
  const existing: LlmapiMessageContentPart[] = message.content ?? [];

  let insertAt = 0;
  existing.forEach((part, index) => {
    if (part.type === "text") insertAt = index + 1;
  });

  const filePart: LlmapiMessageContentPart = {
    type: "text",
    text: buildAttachedFilesText(fileContext),
  };
  const content = [...existing.slice(0, insertAt), filePart, ...existing.slice(insertAt)];

  const result = [...messages];
  result[lastUserIndex] = { ...message, content };
  return result;
}
