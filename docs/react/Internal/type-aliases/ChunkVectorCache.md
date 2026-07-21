# ChunkVectorCache

> **ChunkVectorCache** = `Map`<`string`, [`CachedChunkVectors`](../interfaces/CachedChunkVectors.md)>

Defined in: [src/lib/db/chat/operations.ts:1215](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/operations.ts#1215)

Cache consumed by [searchChunksOp](../functions/searchChunksOp.md), keyed by message id. A plain `Map`
(satisfied by the LRU from `createChunkVectorCache`) — mirrors
`VaultEmbeddingCache` so consumers get the same `clear()`/`delete()`
ergonomics on an encryption-key reset.
