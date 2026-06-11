# ChunkSearchResult

Defined in: [src/lib/db/chat/types.ts:245](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#245)

Search result from chunk-based search

## Properties

### chunkText

> **chunkText**: `string`

Defined in: [src/lib/db/chat/types.ts:247](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#247)

The matching chunk text

***

### message

> **message**: [`StoredMessage`](StoredMessage.md)

Defined in: [src/lib/db/chat/types.ts:249](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#249)

The full message containing this chunk

***

### similarity

> **similarity**: `number`

Defined in: [src/lib/db/chat/types.ts:251](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#251)

Similarity score of the chunk
