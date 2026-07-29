# MessageChunk

Defined in: [src/lib/db/chat/types.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#323)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:331](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#331)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:329](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#329)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:325](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#325)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:327](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#327)

Embedding vector for this chunk
