# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:184](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#184)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:186](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#186)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:188](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#188)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:190](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#190)

Similarity score of the chunk
