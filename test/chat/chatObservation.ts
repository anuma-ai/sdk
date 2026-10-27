import type { ChatBackend } from "../../src/lib/storage/ChatBackend";

/** Everything a user can observe about one conversation, minus ids and clocks that differ by design. */
async function observe(b: ChatBackend, conversationId: string) {
  const conversation = await b.getConversation(conversationId);
  if (!conversation) return null;
  const summary = await b.getSummary(conversationId);
  return {
    title: conversation.title,
    pinned: !!conversation.pinnedAt,
    messages: (await b.getMessages(conversationId)).map((m) => ({
      uniqueId: m.uniqueId,
      role: m.role,
      content: m.content,
      parentMessageId: m.parentMessageId ?? undefined,
      feedback: m.feedback ?? undefined,
      error: m.error ?? undefined,
      fileIds: m.fileIds ?? undefined,
      wasStopped: m.wasStopped ?? false,
    })),
    skeletons: (await b.getMessageSkeletons(conversationId)).map((s) => [
      s.uniqueId,
      s.role,
      s.parentMessageId,
    ]),
    count: await b.getMessageCount(conversationId),
    toolCalls: [...(await b.getToolCallEventIds(conversationId))].sort(),
    summary: summary && [summary.summary, summary.summarizedUpTo, summary.tokenCount],
    links: (await b.getMemoryLinks(conversationId)).map((l) => [l.memoryId, l.score]).sort(),
  };
}

export async function observeAll(b: ChatBackend, ids: readonly string[]) {
  return {
    listed: (await b.getConversations()).map((c) => c.conversationId).sort(),
    conversations: await Promise.all(ids.map((id) => observe(b, id))),
  };
}
