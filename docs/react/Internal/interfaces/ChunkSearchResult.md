# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:242](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#242)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:244](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#244)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:246](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#246)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:248](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#248)

Similarity score of the chunk
