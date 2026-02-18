# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:168](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L168)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:170](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L170)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:172](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L172)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:174](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L174)

Similarity score of the chunk
