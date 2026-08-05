# MessageChunk

Defined in: [src/lib/db/chat/types.ts:342](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#342)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:350](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#350)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:348](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#348)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:344](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#344)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:346](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#346)

Embedding vector for this chunk
