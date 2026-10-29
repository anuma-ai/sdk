# StoredConversation

Defined in: [src/lib/db/chat/types.ts:297](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#297)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:299](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#299)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:303](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#303)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:305](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#305)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:308](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#308)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:302](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#302)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:300](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#300)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:298](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#298)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:304](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#304)
