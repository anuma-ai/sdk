# MessageSkeleton

Defined in: [src/lib/db/chat/types.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#208)

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

Defined in: [src/lib/db/chat/types.ts:217](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#217)

See interface docs — only set for user rows with a user-role parent.

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:211](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#211)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:213](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#213)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#210)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:215](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#215)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#214)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#212)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:209](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#209)
