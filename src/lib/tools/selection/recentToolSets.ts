import type { Database } from "@nozbe/watermelondb";

import { onClearAllEncryptionState } from "../../../react/useEncryption";
import { BUILT_IN_TOOL_SETS } from "../serverTools";
import { TOOL_CATALOG } from "../toolCatalog";

const RECENT_TOOL_SET_TURNS = 2;

const RECENT_TOOL_SET_CONVERSATION_LIMIT = 50;

const CARRYABLE_TOOL_SETS = new Set(
  BUILT_IN_TOOL_SETS.filter(
    (s) => s.anchors.length > 0 && s.anchors.every((a) => a in TOOL_CATALOG)
  ).map((s) => s.name)
);

let recentToolSets = new WeakMap<Database, Map<string, Map<string, number>>>();

function touch(
  conversations: Map<string, Map<string, number>>,
  conversationId: string
): Map<string, number> | undefined {
  const turns = conversations.get(conversationId);
  if (!turns) return undefined;
  conversations.delete(conversationId);
  conversations.set(conversationId, turns);
  return turns;
}

/** Connector sets still carried for a conversation; `[]` without an id. */
export function carriedToolSets(
  database: Database,
  conversationId: string | null | undefined
): string[] {
  if (!conversationId) return [];
  const conversations = recentToolSets.get(database);
  if (!conversations) return [];
  return [...(touch(conversations, conversationId)?.keys() ?? [])];
}

/**
 * Count one completed send (succeeded, detached or stopped) for a conversation: every
 * carried set loses a turn, then each connector set in `matched` (sets that
 * activated by score on this send) is carried for {@link RECENT_TOOL_SET_TURNS}
 * more. A turn is counted when its send finishes, not when it starts. No-op
 * without a conversation id.
 */
export function recordToolSetTurn(
  database: Database,
  conversationId: string | null | undefined,
  matched: ReadonlySet<string>
): void {
  if (!conversationId) return;
  let conversations = recentToolSets.get(database);
  if (!conversations) {
    conversations = new Map();
    recentToolSets.set(database, conversations);
  }
  const turns = touch(conversations, conversationId) ?? new Map<string, number>();
  for (const [name, left] of turns) {
    if (left > 1) turns.set(name, left - 1);
    else turns.delete(name);
  }
  for (const name of matched) {
    if (CARRYABLE_TOOL_SETS.has(name)) turns.set(name, RECENT_TOOL_SET_TURNS);
  }
  if (turns.size === 0) {
    conversations.delete(conversationId);
    return;
  }
  conversations.set(conversationId, turns);
  if (conversations.size > RECENT_TOOL_SET_CONVERSATION_LIMIT) {
    const oldest = conversations.keys().next().value;
    if (oldest !== undefined) conversations.delete(oldest);
  }
}

/** Clear every database's carry. A WeakMap cannot be iterated, so swap it. */
export function resetRecentToolSets(): void {
  recentToolSets = new WeakMap();
}

onClearAllEncryptionState(resetRecentToolSets);
