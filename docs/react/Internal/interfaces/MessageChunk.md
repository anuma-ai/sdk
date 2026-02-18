# MessageChunk

Defined in: [src/lib/db/chat/types.ts:154](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L154)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:162](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L162)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:160](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L160)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:156](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L156)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:158](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L158)

Embedding vector for this chunk
