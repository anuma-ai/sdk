# ChunkSearchStats

Defined in: [src/lib/db/chat/operations.ts:1563](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1563)

Row counts from one [searchChunksOp](../functions/searchChunksOp.md) call.

## Properties

### cacheHits

> **cacheHits**: `number`

Defined in: [src/lib/db/chat/operations.ts:1569](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1569)

Messages scored straight from the vector cache.

***

### rowsFetched

> **rowsFetched**: `number`

Defined in: [src/lib/db/chat/operations.ts:1567](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1567)

Messages whose vectors were read from storage because the cache missed.

***

### rowsScanned

> **rowsScanned**: `number`

Defined in: [src/lib/db/chat/operations.ts:1565](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1565)

Embedded messages in live conversations that the search considered.
