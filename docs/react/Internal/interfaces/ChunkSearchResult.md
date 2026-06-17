# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:250](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#250)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:252](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#252)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:254](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#254)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:256](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#256)

Similarity score of the chunk
