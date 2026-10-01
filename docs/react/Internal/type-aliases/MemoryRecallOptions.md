# MemoryRecallOptions

> **MemoryRecallOptions** = `Omit`<[`RecallOptions`](../interfaces/RecallOptions.md), `"types"` | `"includeChunks"` | `"conversationId"` | `"excludeConversationId"`>

Defined in: [src/lib/memory/store/types.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#64)

Fact-only recall. Conversation chunks are message storage, not memory, so
the chunk-lane knobs are not part of this surface.
