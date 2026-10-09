# MemoryRecallOptions

> **MemoryRecallOptions** = `Omit`<[`RecallOptions`](../interfaces/RecallOptions.md), `"types"` | `"includeChunks"` | `"conversationId"` | `"excludeConversationId"` | `"folderId"`>

Defined in: [src/lib/memory/store/types.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#101)

Fact-only recall. Conversation chunks are message storage, not memory, so
the chunk-lane knobs are not part of this surface; nor is `folderId` (see
[MemoryUpdate](MemoryUpdate.md)).

DEVICE-LOCAL: `decomposeOptions` (portal credentials) and `onDiagnostics` (a
callback) configure work on the device, including with a remote store.
Query embedding/decomposition and the decrypted recall pipeline stay on the
device. Nearby ranks encrypted rows using embeddings and metadata; credentials
and callbacks are never forwarded to it.
