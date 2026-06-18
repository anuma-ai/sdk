# StoredConversation

Defined in: [src/lib/db/chat/types.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#170)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#172)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#176)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#178)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:181](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#181)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#175)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#173)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#171)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#177)
