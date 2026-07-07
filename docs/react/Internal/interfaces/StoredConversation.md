# StoredConversation

Defined in: [src/lib/db/chat/types.ts:219](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#219)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#221)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:225](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#225)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:227](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#227)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:230](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#230)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:224](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#224)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#222)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#220)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#226)
