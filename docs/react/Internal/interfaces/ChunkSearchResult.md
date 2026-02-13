# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:155](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L155)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:157](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L157)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:159](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L159)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:161](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L161)

Similarity score of the chunk
