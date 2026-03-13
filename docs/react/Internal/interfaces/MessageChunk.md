# MessageChunk

Defined in: [src/lib/db/chat/types.ts:192](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#192)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#200)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#198)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#194)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#196)

Embedding vector for this chunk
