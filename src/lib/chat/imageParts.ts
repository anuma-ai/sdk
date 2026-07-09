/**
 * Helpers for deciding which stored files may be sent to the backend as
 * `image_url` content parts.
 */

/**
 * Whether a stored file's URL can be sent to the backend as an `image_url` part.
 *
 * The ai-portal moderation gate can only fetch/scan `http(s)://` and `data:image/`
 * URLs. Any other reference — a local `file://` document path, a `file:` upload id,
 * or a non-image `data:` URI (e.g. `data:application/pdf;...`) — is treated as an
 * unscannable image and fails closed, hard-blocking the ENTIRE turn with a
 * Terms-of-Service refusal.
 *
 * Conversation history is re-serialized on every turn, so a single such file
 * poisons every subsequent message in the conversation: once it is stored, every
 * later message (even "Hey!") gets the refusal. Only emit an image_url part for
 * URLs the backend can actually scan.
 */
export function isSendableImageURL(url: string | undefined | null): url is string {
  if (!url) return false;
  const lower = url.toLowerCase();
  return (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("data:image/")
  );
}
