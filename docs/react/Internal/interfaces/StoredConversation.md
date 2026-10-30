# StoredConversation

Defined in: [src/lib/db/chat/types.ts:309](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#309)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#311)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:315](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#315)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:317](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#317)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:320](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#320)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:314](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#314)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:312](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#312)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:310](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#310)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:316](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#316)
