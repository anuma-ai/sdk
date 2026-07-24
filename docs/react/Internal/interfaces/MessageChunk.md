# MessageChunk

Defined in: [src/lib/db/chat/types.ts:314](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#314)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:322](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#322)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:320](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#320)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:316](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#316)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:318](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#318)

Embedding vector for this chunk
