# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:300](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#300)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:302](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#302)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:304](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#304)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:306](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#306)

Similarity score of the chunk
