# RetainOptions

Defined in: [src/lib/memory/types.ts:126](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#126)

## Properties

### autoMergeThreshold?

> `optional` **autoMergeThreshold**: `number`

Defined in: [src/lib/memory/types.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#134)

Cosine similarity threshold for auto-merge. Default: 0.85.

***

### consolidateOptions?

> `optional` **consolidateOptions**: `object`

Defined in: [src/lib/memory/types.ts:141](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#141)

When provided, runs an LLM-based consolidation pass against the top-K
existing memories above `consolidateThreshold` (looser than auto-merge).
The LLM emits create/update/noop per Hindsight's facet-dedup rules.
Auth/endpoint required; without these we keep the cosine-only path.

**apiKey**

> **apiKey**: `string`

**baseUrl?**

> `optional` **baseUrl**: `string`

**model?**

> `optional` **model**: `string`

***

### consolidateThreshold?

> `optional` **consolidateThreshold**: `number`

Defined in: [src/lib/memory/types.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#147)

Cosine similarity floor for the consolidator candidate set. Default: 0.65.

***

### consolidateTopK?

> `optional` **consolidateTopK**: `number`

Defined in: [src/lib/memory/types.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#149)

Top-K consolidation candidates to feed the LLM. Default: 5.

***

### enableAutoMerge?

> `optional` **enableAutoMerge**: `boolean`

Defined in: [src/lib/memory/types.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#132)

When provided, applies merge-on-write logic instead of plain insert.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:130](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#130)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memory/types.ts:129](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#129)

***

### source?

> `optional` **source**: [`RetainSource`](../type-aliases/RetainSource.md)

Defined in: [src/lib/memory/types.ts:127](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#127)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#128)
