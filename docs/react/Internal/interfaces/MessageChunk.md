# MessageChunk

Defined in: [src/lib/db/chat/types.ts:221](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#221)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:229](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#229)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:227](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#227)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:223](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#223)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:225](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#225)

Embedding vector for this chunk
