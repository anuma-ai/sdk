# MessageSkeleton

Defined in: [src/lib/db/chat/types.ts:191](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#191)

Lightweight, mostly-undecrypted projection of a message row. Contains just
enough for consumers to build the conversation's branch tree (parent/child
structure) without paying the decrypt + embedding-parse cost of a full
[StoredMessage](StoredMessage.md) read.

`content` is populated (decrypted) ONLY for user-role rows whose parent is
also a user-role row — the regeneration artifacts that branch logic must
classify by content prefix. All other rows leave `content` undefined.

## Properties

### content?

> `optional` **content**: `string`

Defined in: [src/lib/db/chat/types.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#200)

See interface docs — only set for user rows with a user-role parent.

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#194)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#196)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:193](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#193)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#198)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#197)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:195](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#195)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:192](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#192)
