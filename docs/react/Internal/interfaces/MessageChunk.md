# MessageChunk

Defined in: [src/lib/db/chat/types.ts:220](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#220)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:228](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#228)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:226](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#226)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#222)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:224](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#224)

Embedding vector for this chunk
