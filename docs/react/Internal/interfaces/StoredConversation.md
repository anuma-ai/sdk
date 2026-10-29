# StoredConversation

Defined in: [src/lib/db/chat/types.ts:299](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#299)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:301](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#301)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:305](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#305)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:307](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#307)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:310](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#310)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:304](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#304)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:302](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#302)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:300](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#300)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:306](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#306)
