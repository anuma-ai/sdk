# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:301](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#301)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:303](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#303)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:305](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#305)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:307](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#307)

Similarity score of the chunk
