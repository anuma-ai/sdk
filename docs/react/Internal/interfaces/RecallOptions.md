# RecallOptions

Defined in: [src/lib/memory/types.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#64)

## Extended by

* [`ReflectOptions`](ReflectOptions.md)

## Properties

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#72)

Search depth. Default: 'low'.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#80)

Restrict chunk search to one conversation. Chunk-only.

***

### decomposeOptions?

> `optional` **decomposeOptions**: `object`

Defined in: [src/lib/memory/types.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#90)

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

Defined in: [src/lib/memory/types.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#82)

Exclude one conversation from chunk search. Chunk-only.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#78)

Vault folder filter. Vault-only.

***

### includeChunks?

> `optional` **includeChunks**: `boolean`

Defined in: [src/lib/memory/types.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#74)

Include source chunks for fact memories that have provenance. Default: false.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/types.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#68)

Max items returned. Default: 8.

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/types.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#70)

Token budget for the result; greedy-truncates after ranking. Not yet enforced; reserved for W1.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#84)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/types.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#76)

Vault scope filter. Vault-only.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/types.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#66)

Which kinds to search. Default: \['fact'].
