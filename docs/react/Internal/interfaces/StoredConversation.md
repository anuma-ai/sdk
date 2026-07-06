# StoredConversation

Defined in: [src/lib/db/chat/types.ts:203](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#203)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:205](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#205)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:209](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#209)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:211](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#211)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#214)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#208)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#206)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:204](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#204)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#210)
