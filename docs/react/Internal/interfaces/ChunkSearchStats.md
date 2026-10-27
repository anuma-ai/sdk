# ChunkSearchStats

Defined in: [src/lib/db/chat/operations.ts:1719](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1719)

Row counts from one [searchChunksOp](../functions/searchChunksOp.md) call.

## Properties

### cacheHits

> **cacheHits**: `number`

Defined in: [src/lib/db/chat/operations.ts:1725](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1725)

Messages scored straight from the vector cache.

***

### rowsFetched

> **rowsFetched**: `number`

Defined in: [src/lib/db/chat/operations.ts:1723](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1723)

Messages whose vectors were read from storage because the cache missed.

***

### rowsScanned

> **rowsScanned**: `number`

Defined in: [src/lib/db/chat/operations.ts:1721](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1721)

Embedded messages in live conversations that the search considered.
