# MemoryRecallOptions

> **MemoryRecallOptions** = `Omit`<[`RecallOptions`](../interfaces/RecallOptions.md), `"types"` | `"includeChunks"` | `"conversationId"` | `"excludeConversationId"` | `"folderId"`>

Defined in: [src/lib/memory/store/types.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#70)

Fact-only recall. Conversation chunks are message storage, not memory, so
the chunk-lane knobs are not part of this surface; nor is `folderId` (see
[MemoryUpdate](MemoryUpdate.md)).

LOCAL-ONLY: `decomposeOptions` (portal credentials) and `onDiagnostics` (a
callback) configure work the backend does in-process. A remote backend runs
query decomposition server-side with its own credentials and ignores both;
every other field is plain data it forwards.
