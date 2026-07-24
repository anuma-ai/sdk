# GetConversationsPageOptions

Defined in: [src/lib/db/chat/types.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#155)

Options for keyset-paginated conversation-list reads ([getConversationsPageOp](../functions/getConversationsPageOp.md)).

## Properties

### before?

> `optional` **before**: `number`

Defined in: [src/lib/db/chat/types.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#161)

Upper-bound `created_at` cursor (epoch ms). Without
`boundaryExcludeUniqueIds` it is EXCLUSIVE: only conversations with
`createdAt < before` are returned. Omit to fetch the newest page.

***

### boundaryExcludeUniqueIds?

> `optional` **boundaryExcludeUniqueIds**: `string`\[]

Defined in: [src/lib/db/chat/types.ts:171](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#171)

uniqueIds of the rows the caller already holds AT the `before` boundary.
`created_at` is NOT unique (a bulk restore/import writes many rows with the
same timestamp) — with an exclusive cursor, an unseen row sharing the
boundary timestamp would be silently skipped by every page. When provided,
the boundary timestamp is fetched INCLUSIVELY and these known rows are
filtered out, so a boundary-timestamp row is returned exactly once. Mirrors
[GetMessagesPageOptions.boundaryExcludeUniqueIds](GetMessagesPageOptions.md#boundaryexcludeuniqueids).

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/db/chat/types.ts:178](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#178)

Maximum rows to return — the NEWEST `limit` rows of the matching range.
Defaults to 200. A non-positive or non-finite value yields an EMPTY page
(never an unbounded read — SQLite treats `LIMIT -1` as "no limit");
fractional values are floored.
