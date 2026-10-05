/**
 * Connector tool sets carried into the next few sends of a conversation.
 *
 * Client-tool selection ranks only the latest prompt, so a terse follow-up
 * ("Yes") to a connector offer ("shall I send it?") loses that connector's
 * tools. A connector set that activated by score on one send is carried, as if
 * the app had marked it active, into the next {@link RECENT_TOOL_SET_TURNS}
 * sends of the same conversation. Only a send that succeeded or detached (the
 * portal keeps generating) counts, so a retried request reads the same carry as
 * the attempt that failed.
 *
 * Module-level so every `useChatStorage` instance mounted for one conversation
 * shares it; bounded so long sessions don't leak. In memory only.
 */

import { onClearAllEncryptionState } from "../../../react/useEncryption";
import { BUILT_IN_TOOL_SETS } from "../serverTools";
import { TOOL_CATALOG } from "../toolCatalog";

const RECENT_TOOL_SET_TURNS = 2;

const RECENT_TOOL_SET_CONVERSATION_LIMIT = 50;

// A connector set has at least one anchor, and every anchor is a connector
// tool. Other sets (app-generation, documents) can activate on chitchat and
// bring a system prompt with them, so they are never carried.
const CARRYABLE_TOOL_SETS = new Set(
  BUILT_IN_TOOL_SETS.filter(
    (s) => s.anchors.length > 0 && s.anchors.every((a) => a in TOOL_CATALOG)
  ).map((s) => s.name)
);

// Conversation id → set name → sends left. Map order is recency order.
const recentToolSets = new Map<string, Map<string, number>>();

function touch(conversationId: string): Map<string, number> | undefined {
  const turns = recentToolSets.get(conversationId);
  if (!turns) return undefined;
  recentToolSets.delete(conversationId);
  recentToolSets.set(conversationId, turns);
  return turns;
}

/** Connector sets still carried for a conversation; `[]` without an id. */
export function carriedToolSets(conversationId: string | null | undefined): string[] {
  if (!conversationId) return [];
  return [...(touch(conversationId)?.keys() ?? [])];
}

/**
 * Count one completed send (succeeded or detached) for a conversation: every
 * carried set loses a turn, then each connector set in `matched` (sets that
 * activated by score on this send) is carried for {@link RECENT_TOOL_SET_TURNS}
 * more. A turn is counted when its send finishes, not when it starts. No-op
 * without an id.
 */
export function recordToolSetTurn(
  conversationId: string | null | undefined,
  matched: ReadonlySet<string>
): void {
  if (!conversationId) return;
  const turns = touch(conversationId) ?? new Map<string, number>();
  for (const [name, left] of turns) {
    if (left > 1) turns.set(name, left - 1);
    else turns.delete(name);
  }
  for (const name of matched) {
    if (CARRYABLE_TOOL_SETS.has(name)) turns.set(name, RECENT_TOOL_SET_TURNS);
  }
  if (turns.size === 0) {
    recentToolSets.delete(conversationId);
    return;
  }
  recentToolSets.set(conversationId, turns);
  if (recentToolSets.size > RECENT_TOOL_SET_CONVERSATION_LIMIT) {
    const oldest = recentToolSets.keys().next().value;
    if (oldest !== undefined) recentToolSets.delete(oldest);
  }
}

/** Clear every conversation's carry. */
export function resetRecentToolSets(): void {
  recentToolSets.clear();
}

// Drop the carry on sign-out so it never outlives the session.
onClearAllEncryptionState(resetRecentToolSets);
