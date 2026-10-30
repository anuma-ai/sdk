# MessageSkeleton

Defined in: [src/lib/db/chat/types.ts:239](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#239)

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

Defined in: [src/lib/db/chat/types.ts:248](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#248)

See interface docs — only set for user rows with a user-role parent.

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:242](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#242)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#244)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:241](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#241)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:246](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#246)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#245)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:243](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#243)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:240](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#240)
