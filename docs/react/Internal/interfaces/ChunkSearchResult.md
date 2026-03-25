# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:207](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#207)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:209](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#209)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:211](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#211)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:213](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#213)

Similarity score of the chunk
