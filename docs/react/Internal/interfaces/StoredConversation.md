# StoredConversation

Defined in: [src/lib/db/chat/types.ts:286](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#286)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:288](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#288)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:292](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#292)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:294](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#294)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:297](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#297)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:291](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#291)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:289](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#289)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:287](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#287)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:293](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#293)
