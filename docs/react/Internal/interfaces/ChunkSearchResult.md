# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:158](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L158)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:160](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L160)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:162](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L162)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:164](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L164)

Similarity score of the chunk
