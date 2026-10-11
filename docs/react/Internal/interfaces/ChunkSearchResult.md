# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:395](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#395)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:397](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#397)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:399](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#399)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:401](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#401)

Similarity score of the chunk
