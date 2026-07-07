# MessageSkeleton

Defined in: [src/lib/db/chat/types.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#164)

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

Defined in: [src/lib/db/chat/types.ts:173](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#173)

See interface docs — only set for user rows with a user-role parent.

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#167)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:169](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#169)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#166)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#171)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#170)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#168)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#165)
