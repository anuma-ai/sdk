# MessageChunk

Defined in: [src/lib/db/chat/types.ts:230](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#230)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:238](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#238)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:236](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#236)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:232](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#232)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:234](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#234)

Embedding vector for this chunk
