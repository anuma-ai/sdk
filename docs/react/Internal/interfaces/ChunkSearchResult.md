# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:378](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#378)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:380](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#380)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:382](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#382)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:384](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#384)

Similarity score of the chunk
