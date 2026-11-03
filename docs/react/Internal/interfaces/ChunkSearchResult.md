# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:422](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#422)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:424](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#424)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:426](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#426)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:428](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#428)

Similarity score of the chunk
