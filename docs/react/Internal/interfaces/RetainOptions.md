# RetainOptions

Defined in: [src/lib/memory/types.ts:134](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#134)

## Properties

### autoMergeThreshold?

> `optional` **autoMergeThreshold**: `number`

Defined in: [src/lib/memory/types.ts:142](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#142)

Cosine similarity threshold for auto-merge. Default: 0.85.

***

### consolidateOptions?

> `optional` **consolidateOptions**: `object`

Defined in: [src/lib/memory/types.ts:149](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#149)

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

Defined in: [src/lib/memory/types.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#155)

Cosine similarity floor for the consolidator candidate set. Default: 0.65.

***

### consolidateTopK?

> `optional` **consolidateTopK**: `number`

Defined in: [src/lib/memory/types.ts:157](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#157)

Top-K consolidation candidates to feed the LLM. Default: 5.

***

### enableAutoMerge?

> `optional` **enableAutoMerge**: `boolean`

Defined in: [src/lib/memory/types.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#140)

When provided, applies merge-on-write logic instead of plain insert.

***

### eventTime?

> `optional` **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; } | `null`

Defined in: [src/lib/memory/types.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#164)

W6 temporal lane — when the event in this fact occurred. Persisted to
memory\_vault.event\_time\_\* columns; recall's temporal lane filters
and boosts memories whose event-time overlaps the query window.
Auto-extraction emits this; manual writes can omit it.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:138](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#138)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memory/types.ts:137](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#137)

***

### source?

> `optional` **source**: [`RetainSource`](../type-aliases/RetainSource.md)

Defined in: [src/lib/memory/types.ts:135](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#135)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#136)
