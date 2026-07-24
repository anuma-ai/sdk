# StoredConversation

Defined in: [src/lib/db/chat/types.ts:247](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#247)

## Properties

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:249](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#249)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:253](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#253)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:255](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#255)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:258](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#258)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#252)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:250](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#250)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:248](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#248)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:254](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#254)
