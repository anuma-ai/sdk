# StoredConversation

Defined in: [src/lib/db/chat/types.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#256)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#258)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:262](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#262)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:264](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#264)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:267](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#267)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:261](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#261)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:259](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#259)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:257](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#257)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:263](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#263)
