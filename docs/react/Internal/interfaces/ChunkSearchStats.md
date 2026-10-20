# ChunkSearchStats

Defined in: [src/lib/db/chat/operations.ts:1734](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1734)

Row counts from one [searchChunksOp](../functions/searchChunksOp.md) call.

## Properties

### cacheHits

> **cacheHits**: `number`

Defined in: [src/lib/db/chat/operations.ts:1740](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1740)

Messages scored straight from the vector cache.

***

### rowsFetched

> **rowsFetched**: `number`

Defined in: [src/lib/db/chat/operations.ts:1738](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1738)

Messages whose vectors were read from storage because the cache missed.

***

### rowsScanned

> **rowsScanned**: `number`

Defined in: [src/lib/db/chat/operations.ts:1736](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1736)

Embedded messages in live conversations that the search considered.
