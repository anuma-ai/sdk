# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:409](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#409)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:411](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#411)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:413](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#413)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:415](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#415)

Similarity score of the chunk
