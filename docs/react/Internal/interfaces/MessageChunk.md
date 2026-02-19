# MessageChunk

Defined in: [src/lib/db/chat/types.ts:153](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L153)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:161](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L161)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:159](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L159)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:155](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L155)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:157](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/types.ts#L157)

Embedding vector for this chunk
