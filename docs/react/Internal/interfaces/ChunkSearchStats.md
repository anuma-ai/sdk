# ChunkSearchStats

Defined in: [src/lib/db/chat/operations.ts:1681](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1681)

Row counts from one [searchChunksOp](../functions/searchChunksOp.md) call.

## Properties

### cacheHits

> **cacheHits**: `number`

Defined in: [src/lib/db/chat/operations.ts:1687](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1687)

Messages scored straight from the vector cache.

***

### rowsFetched

> **rowsFetched**: `number`

Defined in: [src/lib/db/chat/operations.ts:1685](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1685)

Messages whose vectors were read from storage because the cache missed.

***

### rowsScanned

> **rowsScanned**: `number`

Defined in: [src/lib/db/chat/operations.ts:1683](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1683)

Embedded messages in live conversations that the search considered.
