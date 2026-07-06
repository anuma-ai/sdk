# MessageChunk

Defined in: [src/lib/db/chat/types.ts:270](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#270)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:278](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#278)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:276](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#276)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:272](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#272)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:274](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#274)

Embedding vector for this chunk
