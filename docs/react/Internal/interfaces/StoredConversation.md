# StoredConversation

Defined in: [src/lib/db/chat/types.ts:289](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#289)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:291](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#291)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:295](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#295)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:297](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#297)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:300](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#300)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:294](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#294)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:292](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#292)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:290](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#290)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:296](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#296)
