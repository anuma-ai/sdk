# StoredConversation

Defined in: [src/lib/db/chat/types.ts:310](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#310)

## Properties

### context?

> `optional` **context**: `object`

Defined in: [src/lib/db/chat/types.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#323)

Per-conversation app state kept with the conversation in vault, keyed by the app; absent on local storage.

**Index Signature**

\[`key`: `string`]: [`ChatJson`](../type-aliases/ChatJson.md)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:312](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#312)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:316](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#316)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:318](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#318)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:321](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#321)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:315](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#315)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:313](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#313)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#311)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:317](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#317)
