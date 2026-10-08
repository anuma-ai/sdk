# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:394](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#394)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:396](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#396)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:398](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#398)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:400](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#400)

Similarity score of the chunk
