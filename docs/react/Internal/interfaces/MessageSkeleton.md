# MessageSkeleton

Defined in: [src/lib/db/chat/types.ts:152](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#152)

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

Defined in: [src/lib/db/chat/types.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#161)

See interface docs — only set for user rows with a user-role parent.

***

### conversationId

> **conversationId**: `string`

Defined in: [src/lib/db/chat/types.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#155)

***

### createdAt

> **createdAt**: `Date`

Defined in: [src/lib/db/chat/types.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#157)

***

### messageId

> **messageId**: `number`

Defined in: [src/lib/db/chat/types.ts:154](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#154)

***

### model?

> `optional` **model**: `string`

Defined in: [src/lib/db/chat/types.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#159)

***

### parentMessageId?

> `optional` **parentMessageId**: `string`

Defined in: [src/lib/db/chat/types.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#158)

***

### role

> **role**: [`ChatRole`](../type-aliases/ChatRole.md)

Defined in: [src/lib/db/chat/types.ts:156](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#156)

***

### uniqueId

> **uniqueId**: `string`

Defined in: [src/lib/db/chat/types.ts:153](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#153)
