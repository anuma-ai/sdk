# MemoryRecallOptions

> **MemoryRecallOptions** = `Omit`<[`RecallOptions`](../interfaces/RecallOptions.md), `"types"` | `"includeChunks"` | `"conversationId"` | `"excludeConversationId"`>

Defined in: src/lib/memory/store/types.ts:57

Fact-only recall. Conversation chunks are message storage, not memory, so
the chunk-lane knobs are not part of this surface.
