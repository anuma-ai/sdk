# ChunkSearchStats

Defined in: [src/lib/db/chat/operations.ts:1701](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1701)

Row counts from one [searchChunksOp](../functions/searchChunksOp.md) call.

## Properties

### cacheHits

> **cacheHits**: `number`

Defined in: [src/lib/db/chat/operations.ts:1707](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1707)

Messages scored straight from the vector cache.

***

### rowsFetched

> **rowsFetched**: `number`

Defined in: [src/lib/db/chat/operations.ts:1705](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1705)

Messages whose vectors were read from storage because the cache missed.

***

### rowsScanned

> **rowsScanned**: `number`

Defined in: [src/lib/db/chat/operations.ts:1703](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1703)

Embedded messages in live conversations that the search considered.
