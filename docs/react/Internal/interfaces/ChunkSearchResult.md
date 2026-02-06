# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:154](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L154)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:156](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L156)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:158](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L158)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:160](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L160)

Similarity score of the chunk
