# ChunkSearchStats

Defined in: [src/lib/db/chat/operations.ts:1440](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1440)

Row counts from one [searchChunksOp](../functions/searchChunksOp.md) call.

## Properties

### cacheHits

> **cacheHits**: `number`

Defined in: [src/lib/db/chat/operations.ts:1446](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1446)

Messages scored straight from the vector cache.

***

### rowsFetched

> **rowsFetched**: `number`

Defined in: [src/lib/db/chat/operations.ts:1444](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1444)

Messages whose vectors were read from storage because the cache missed.

***

### rowsScanned

> **rowsScanned**: `number`

Defined in: [src/lib/db/chat/operations.ts:1442](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1442)

Embedded messages in live conversations that the search considered.
