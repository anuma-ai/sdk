# StoredConversation

Defined in: [src/lib/db/chat/types.ts:298](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#298)

## Properties

### context?

> `optional` **context**: `object`

Defined in: [src/lib/db/chat/types.ts:311](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#311)

Per-conversation app state kept with the conversation in vault, keyed by the app; absent on local storage.

**Index Signature**

\[`key`: `string`]: [`ChatJson`](../type-aliases/ChatJson.md)

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:300](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#300)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:304](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#304)

***

### isDeleted

> **isDeleted**: `boolean`

Defined in: [src/lib/db/chat/types.ts:306](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#306)

***

### pinnedAt?

> `optional` **pinnedAt**: `Date` | `null`

Defined in: [src/lib/db/chat/types.ts:309](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#309)

When the conversation was pinned to the top of the list; null/unset = not pinned.
`null` (not `undefined`) at runtime for unpinned rows — mirrors the model field.

***

### projectId?

> `optional` **projectId**: `string`

Defined in: [src/lib/db/chat/types.ts:303](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#303)

Optional project ID this conversation belongs to

***

### title

> **title**: `string`

Defined in: [src/lib/db/chat/types.ts:301](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#301)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:299](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#299)

***

### updatedAt

> **updatedAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:305](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#305)
