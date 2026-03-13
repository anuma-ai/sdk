# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:206](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#206)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:208](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#208)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:210](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#210)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:212](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#212)

Similarity score of the chunk
