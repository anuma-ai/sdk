# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:133](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L133)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:135](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L135)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:137](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L137)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:139](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L139)

Similarity score of the chunk
