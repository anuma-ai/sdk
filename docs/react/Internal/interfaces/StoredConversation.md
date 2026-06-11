# StoredConversation

Defined in: [src/lib/db/chat/types.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#164)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#166)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#170)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#172)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:175](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#175)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#169)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#167)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#165)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#171)
