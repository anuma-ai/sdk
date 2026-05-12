# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:234](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#234)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:236](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#236)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:238](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#238)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:240](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#240)

Similarity score of the chunk
