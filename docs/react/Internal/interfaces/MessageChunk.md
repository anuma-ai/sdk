# MessageChunk

Defined in: [src/lib/db/chat/types.ts:193](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#193)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:201](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#201)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:199](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#199)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:195](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#195)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:197](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#197)

Embedding vector for this chunk
