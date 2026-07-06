# GetMessagesPageOptions

Defined in: [src/lib/db/chat/types.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#127)

Options for paginated message reads (getMessagesPageOp).

## Properties

### beforeMessageId?

> `optional` **beforeMessageId**: `number`

Defined in: [src/lib/db/chat/types.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#132)

Exclusive upper bound: only messages with `messageId < beforeMessageId`
are returned. Omit to fetch the newest page (the conversation tail).

***

### limit

> **limit**: `number`

Defined in: [src/lib/db/chat/types.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#134)

Maximum rows to return — the NEWEST `limit` rows of the matching range.
