# MessageChunk

Defined in: [src/lib/db/chat/types.ts:143](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L143)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:151](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L151)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:149](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L149)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:145](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L145)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:147](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L147)

Embedding vector for this chunk
