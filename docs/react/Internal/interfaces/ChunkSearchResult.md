# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:181](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L181)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:183](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L183)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:185](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L185)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:187](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L187)

Similarity score of the chunk
