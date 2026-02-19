# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:167](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L167)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:169](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L169)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:171](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L171)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:173](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L173)

Similarity score of the chunk
