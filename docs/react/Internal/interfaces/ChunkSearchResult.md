# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#210)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#212)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:214](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#214)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:216](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#216)

Similarity score of the chunk
