# MessageChunk

Defined in: [src/lib/db/chat/types.ts:142](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L142)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:150](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L150)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:148](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L148)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:144](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L144)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:146](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L146)

Embedding vector for this chunk
