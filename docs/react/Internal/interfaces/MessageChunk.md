# MessageChunk

Defined in: [src/lib/db/chat/types.ts:167](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L167)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:175](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L175)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:173](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L173)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:169](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L169)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:171](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L171)

Embedding vector for this chunk
