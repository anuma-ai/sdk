# GetMessagesPageOptions

Defined in: [src/lib/db/chat/types.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#127)

Options for paginated message reads (getMessagesPageOp).

## Properties

### beforeMessageId?

> `optional` **beforeMessageId**: `number`

Defined in: [src/lib/db/chat/types.ts:133](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#133)

Upper-bound cursor. Without `boundaryExcludeUniqueIds` it is EXCLUSIVE:
only messages with `messageId < beforeMessageId` are returned. Omit to
fetch the newest page (the conversation tail).

***

### boundaryExcludeUniqueIds?

> `optional` **boundaryExcludeUniqueIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#143)

uniqueIds of the rows the caller already holds AT the `beforeMessageId`
boundary. `message_id` is not guaranteed unique in legacy data (ids were
assigned count-based, so a mid-thread delete let the next create reuse a
freed id) — with an exclusive cursor, an unseen row sharing the boundary
id would be silently skipped by every page. When this is provided, the
boundary id is fetched INCLUSIVELY and these known rows are filtered
out, so a duplicated boundary row is returned exactly once.

***

### limit

> **limit**: `number`

Defined in: [src/lib/db/chat/types.ts:150](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#150)

Maximum rows to return — the NEWEST `limit` rows of the matching range.
Must be a positive integer: non-positive or non-finite values yield an
EMPTY page (never an unbounded read — SQLite treats `LIMIT -1` as "no
limit"), and fractional values are floored.
