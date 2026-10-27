# ChunkSearchStats

Defined in: [src/lib/db/chat/operations.ts:1702](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1702)

Row counts from one [searchChunksOp](../functions/searchChunksOp.md) call.

## Properties

### cacheHits

> **cacheHits**: `number`

Defined in: [src/lib/db/chat/operations.ts:1708](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1708)

Messages scored straight from the vector cache.

***

### rowsFetched

> **rowsFetched**: `number`

Defined in: [src/lib/db/chat/operations.ts:1706](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1706)

Messages whose vectors were read from storage because the cache missed.

***

### rowsScanned

> **rowsScanned**: `number`

Defined in: [src/lib/db/chat/operations.ts:1704](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1704)

Embedded messages in live conversations that the search considered.
