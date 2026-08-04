# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:356](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#356)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:358](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#358)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:360](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#360)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:362](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#362)

Similarity score of the chunk
