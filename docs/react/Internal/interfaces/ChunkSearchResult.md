# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:410](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#410)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:412](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#412)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:414](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#414)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:416](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#416)

Similarity score of the chunk
