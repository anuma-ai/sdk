# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:328](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#328)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:330](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#330)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:332](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#332)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:334](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#334)

Similarity score of the chunk
