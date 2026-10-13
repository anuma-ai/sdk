# MessageChunk

Defined in: [src/lib/db/chat/types.ts:353](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#353)

A chunk of a message with its own embedding for fine-grained search

## Properties

### endOffset

> **endOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:390](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#390)

Character offset where this chunk ends in the original message

***

### startOffset

> **startOffset**: `number`

Defined in: [src/lib/db/chat/types.ts:388](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#388)

Character offset where this chunk starts in the original message

***

### text?

> `optional` **text**: `string`

Defined in: [src/lib/db/chat/types.ts:373](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#373)

The chunk text — IN MEMORY ONLY. Not persisted (sdk#880).

`chunkText` covers a message end to end with a 50-character overlap, so the
chunk set of any message over 400 characters reconstructs the whole thing.
Storing it put a fully readable copy of the message next to its own
ciphertext `content` on devices with at-rest encryption enabled.

`updateMessageChunksOp` now strips this before writing and readers rebuild
the snippet from [startOffset](#startoffset)/[endOffset](#endoffset) against the message's
own (decrypted) `content` — so the text exists exactly once, under the
protection `content` already has. Encrypting the column instead was
rejected: the client reads this column raw and `JSON.parse`s it in four
places, each swallowing the throw and silently scoring 0.

Optional because rows written before that change still carry it, and
readers prefer a stored value when present. It is populated in memory by
`chunkText()` and on the way out of a search.

***

### vector

> **vector**: `number`\[]

Defined in: [src/lib/db/chat/types.ts:386](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/chat/types.ts#386)

Embedding vector for this chunk.

Read it through `decodeChunkVector` rather than passing it straight to a
numeric call site. This stays `number[]` only while the writer still emits
JSON arrays; it widens to `number[] | string` in the release that flips the
writer to base64 float32 (sdk#862), and that widening is the whole reason
that release is a major. Readers already accept both, so code written
against the decoder today needs no change when it happens — code written
against the raw array degrades silently, because a string handed to
`Float32Array.from` yields one NaN per character rather than an error.
