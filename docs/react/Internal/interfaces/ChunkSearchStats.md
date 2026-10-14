# ChunkSearchStats

Defined in: [src/lib/db/chat/operations.ts:1559](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1559)

Row counts from one [searchChunksOp](../functions/searchChunksOp.md) call.

## Properties

### cacheHits

> **cacheHits**: `number`

Defined in: [src/lib/db/chat/operations.ts:1565](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1565)

Messages scored straight from the vector cache.

***

### rowsFetched

> **rowsFetched**: `number`

Defined in: [src/lib/db/chat/operations.ts:1563](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1563)

Messages whose vectors were read from storage because the cache missed.

***

### rowsScanned

> **rowsScanned**: `number`

Defined in: [src/lib/db/chat/operations.ts:1561](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1561)

Embedded messages in live conversations that the search considered.
