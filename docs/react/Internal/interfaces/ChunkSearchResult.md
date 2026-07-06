# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:289](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#289)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:291](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#291)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:293](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#293)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:295](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#295)

Similarity score of the chunk
