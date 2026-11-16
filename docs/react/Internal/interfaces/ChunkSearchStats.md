# ChunkSearchStats

Defined in: [src/lib/db/chat/operations.ts:1821](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1821)

Row counts from one [searchChunksOp](../functions/searchChunksOp.md) call.

## Properties

### cacheHits

> **cacheHits**: `number`

Defined in: [src/lib/db/chat/operations.ts:1827](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1827)

Messages scored straight from the vector cache.

***

### rowsFetched

> **rowsFetched**: `number`

Defined in: [src/lib/db/chat/operations.ts:1825](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1825)

Messages whose vectors were read from storage because the cache missed.

***

### rowsScanned

> **rowsScanned**: `number`

Defined in: [src/lib/db/chat/operations.ts:1823](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1823)

Embedded messages in live conversations that the search considered.
