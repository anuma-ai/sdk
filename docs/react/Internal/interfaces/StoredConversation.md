# StoredConversation

Defined in: [src/lib/db/chat/types.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#321)

## Properties

### context?

> `optional` **context**: `object`

Defined in: [src/lib/db/chat/types.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#334)

Per-conversation app state kept with the conversation in vault, keyed by the app; absent on local storage.

**Index Signature**

\[`key`: `string`]: [`ChatJson`](../type-aliases/ChatJson.md)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#323)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:327](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#327)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:329](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#329)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:332](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#332)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:326](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#326)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:324](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#324)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:322](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#322)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:328](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#328)
