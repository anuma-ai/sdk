# RecallOptions

Defined in: [src/lib/memory/types.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#81)

## Extended by

* [`ReflectOptions`](ReflectOptions.md)

## Properties

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#89)

Search depth. Default: 'low'.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:97](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#97)

Restrict chunk search to one conversation. Chunk-only.

***

### decomposeOptions?

> `optional` **decomposeOptions**: `object`

Defined in: [src/lib/memory/types.ts:107](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#107)

Auth + endpoint for the LLM-based query decomposition pass. Without
these, decompose is skipped even at `budget: 'high'`. Mirrors the
shape used by `searchVaultMemories`.

**apiKey**

> **apiKey**: `string`

**baseUrl?**

> `optional` **baseUrl**: `string`

**model?**

> `optional` **model**: `string`

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/types.ts:99](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#99)

Exclude one conversation from chunk search. Chunk-only.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#95)

Vault folder filter. Vault-only.

***

### includeChunks?

> `optional` **includeChunks**: `boolean`

Defined in: [src/lib/memory/types.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#91)

Include source chunks for fact memories that have provenance. Default: false.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/types.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#85)

Max items returned. Default: 8.

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/types.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#87)

Token budget for the result; greedy-truncates after ranking. Not yet enforced; reserved for W1.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:101](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#101)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/types.ts:119](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#119)

Reference "now" for resolving relative temporal phrases in the
query ("last week", "yesterday", "N days ago"). Default: `Date.now()`.
Override for back-dated evaluation harnesses (bench corpora dated
2021–2023) and for deterministic tests — otherwise the W6 lane
resolves windows in 2026 and never overlaps stored event\_time.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/types.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#93)

Vault scope filter. Vault-only.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/types.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#83)

Which kinds to search. Default: \['fact'].
