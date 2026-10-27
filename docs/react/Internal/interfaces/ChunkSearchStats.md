# ChunkSearchStats

Defined in: [src/lib/db/chat/operations.ts:1740](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1740)

Row counts from one [searchChunksOp](../functions/searchChunksOp.md) call.

## Properties

### cacheHits

> **cacheHits**: `number`

Defined in: [src/lib/db/chat/operations.ts:1746](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1746)

Messages scored straight from the vector cache.

***

### rowsFetched

> **rowsFetched**: `number`

Defined in: [src/lib/db/chat/operations.ts:1744](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1744)

Messages whose vectors were read from storage because the cache missed.

***

### rowsScanned

> **rowsScanned**: `number`

Defined in: [src/lib/db/chat/operations.ts:1742](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1742)

Embedded messages in live conversations that the search considered.
