# StoredConversation

Defined in: [src/lib/db/chat/types.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#208)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#210)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#214)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#216)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:219](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#219)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:213](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#213)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:211](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#211)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:209](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#209)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:215](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#215)
