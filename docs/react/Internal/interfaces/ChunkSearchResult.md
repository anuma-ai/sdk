# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:432](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#432)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:434](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#434)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:436](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#436)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:438](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#438)

Similarity score of the chunk
