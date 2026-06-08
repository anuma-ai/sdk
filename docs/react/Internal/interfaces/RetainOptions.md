# RetainOptions

Defined in: [src/lib/memory/types.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#159)

## Properties

### autoMergeThreshold?

> `optional` **autoMergeThreshold**: `number`

Defined in: [src/lib/memory/types.ts:167](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#167)

Cosine similarity threshold for auto-merge. Default: 0.85.

***

### consolidateOptions?

> `optional` **consolidateOptions**: `object`

Defined in: [src/lib/memory/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#174)

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

Defined in: [src/lib/memory/types.ts:180](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#180)

Cosine similarity floor for the consolidator candidate set. Default: 0.65.

***

### consolidateTopK?

> `optional` **consolidateTopK**: `number`

Defined in: [src/lib/memory/types.ts:182](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#182)

Top-K consolidation candidates to feed the LLM. Default: 5.

***

### enableAutoMerge?

> `optional` **enableAutoMerge**: `boolean`

Defined in: [src/lib/memory/types.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#165)

When provided, applies merge-on-write logic instead of plain insert.

***

### eventTime?

> `optional` **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; } | `null`

Defined in: [src/lib/memory/types.ts:189](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#189)

W6 temporal lane — when the event in this fact occurred. Persisted to
memory\_vault.event\_time\_\* columns; recall's temporal lane filters
and boosts memories whose event-time overlaps the query window.
Auto-extraction emits this; manual writes can omit it.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#163)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memory/types.ts:162](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#162)

***

### source?

> `optional` **source**: [`RetainSource`](../type-aliases/RetainSource.md)

Defined in: [src/lib/memory/types.ts:160](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#160)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:161](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#161)
