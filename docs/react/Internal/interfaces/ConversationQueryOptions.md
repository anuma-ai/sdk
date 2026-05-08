# ConversationQueryOptions

Defined in: [src/lib/storage/ChatStorageAdapter.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#80)

Common filter options for conversation queries. Kept deliberately narrow —
most call sites only need these.

## Properties

### projectId?

> `optional` **projectId**: `string` | `null`

Defined in: [src/lib/storage/ChatStorageAdapter.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/storage/ChatStorageAdapter.ts#82)

If set, only return conversations in this project. `null` = no project.
