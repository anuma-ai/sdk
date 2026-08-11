# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:396](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#396)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:398](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#398)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:400](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#400)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:402](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#402)

Similarity score of the chunk
