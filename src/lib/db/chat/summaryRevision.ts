import type { Database } from "@nozbe/watermelondb";

const conversationRevisions = new WeakMap<Database, Map<string, number>>();

export function getConversationRevision(database: Database, conversationId: string): number {
  return conversationRevisions.get(database)?.get(conversationId) ?? 0;
}

export function advanceConversationRevision(database: Database, conversationId: string): void {
  let revisions = conversationRevisions.get(database);
  if (!revisions) {
    revisions = new Map();
    conversationRevisions.set(database, revisions);
  }
  revisions.set(conversationId, getConversationRevision(database, conversationId) + 1);
}

export function assertConversationRevision(
  database: Database,
  conversationId: string,
  revision: number
): void {
  if (getConversationRevision(database, conversationId) !== revision) {
    throw new Error("The conversation changed during summarization. Retry the request.");
  }
}
