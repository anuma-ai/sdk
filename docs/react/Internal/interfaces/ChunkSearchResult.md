# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:419](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#419)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:421](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#421)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:423](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#423)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:425](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#425)

Similarity score of the chunk
