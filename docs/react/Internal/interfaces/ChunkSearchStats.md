# ChunkSearchStats

Defined in: [src/lib/db/chat/operations.ts:1741](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1741)

Row counts from one [searchChunksOp](../functions/searchChunksOp.md) call.

## Properties

### cacheHits

> **cacheHits**: `number`

Defined in: [src/lib/db/chat/operations.ts:1747](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1747)

Messages scored straight from the vector cache.

***

### rowsFetched

> **rowsFetched**: `number`

Defined in: [src/lib/db/chat/operations.ts:1745](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1745)

Messages whose vectors were read from storage because the cache missed.

***

### rowsScanned

> **rowsScanned**: `number`

Defined in: [src/lib/db/chat/operations.ts:1743](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1743)

Embedded messages in live conversations that the search considered.
