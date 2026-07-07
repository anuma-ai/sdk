# StoredConversation

Defined in: [src/lib/db/chat/types.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#220)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#222)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#226)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:228](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#228)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:231](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#231)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:225](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#225)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:223](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#223)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#221)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:227](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#227)
