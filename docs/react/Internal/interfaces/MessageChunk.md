# MessageChunk

Defined in: [src/lib/db/chat/types.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#L168)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:176](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#L176)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#L174)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#L170)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#L172)

Embedding vector for this chunk
