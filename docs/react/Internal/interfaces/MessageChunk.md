# MessageChunk

Defined in: [src/lib/db/chat/types.ts:353](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#353)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:372](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#372)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:370](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#370)

Character offset where this chunk starts in the original message

***

### text

> **text**: `string`

Defined in: [src/lib/db/chat/types.ts:355](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#355)

The chunk text

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:368](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#368)

Embedding vector for this chunk.

Read it through `decodeChunkVector` rather than passing it straight to a
numeric call site. This stays `number[]` only while the writer still emits
JSON arrays; it widens to `number[] | string` in the release that flips the
writer to base64 float32 (sdk#862), and that widening is the whole reason
that release is a major. Readers already accept both, so code written
against the decoder today needs no change when it happens — code written
against the raw array degrades silently, because a string handed to
`Float32Array.from` yields one NaN per character rather than an error.
