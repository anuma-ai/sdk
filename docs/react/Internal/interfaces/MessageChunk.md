# MessageChunk

Defined in: [src/lib/db/chat/types.ts:196](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#196)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:204](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#204)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:202](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#202)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:198](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#198)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:200](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#200)

Embedding vector for this chunk
