# ConversationQueryOptions

Defined in: [src/lib/storage/ChatStorageAdapter.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#32)

Common filter options for conversation queries. Kept deliberately narrow —
most call sites only need these.

## Properties

### projectId?

> `optional` **projectId**: `string` | `null`

Defined in: [src/lib/storage/ChatStorageAdapter.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#34)

If set, only return conversations in this project. `null` = no project.
