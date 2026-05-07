# RecallOptions

Defined in: [src/lib/memory/types.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#63)

## Properties

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#71)

Search depth. Default: 'low'.

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#79)

Restrict chunk search to one conversation. Chunk-only.

***

### decomposeOptions?

> `optional` **decomposeOptions**: `object`

Defined in: [src/lib/memory/types.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#89)

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

Defined in: [src/lib/memory/types.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#81)

Exclude one conversation from chunk search. Chunk-only.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#77)

Vault folder filter. Vault-only.

***

### includeChunks?

> `optional` **includeChunks**: `boolean`

Defined in: [src/lib/memory/types.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#73)

Include source chunks for fact memories that have provenance. Default: false.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/types.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#67)

Max items returned. Default: 8.

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/types.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#69)

Token budget for the result; greedy-truncates after ranking. Not yet enforced; reserved for W1.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#83)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/types.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#75)

Vault scope filter. Vault-only.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/types.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#65)

Which kinds to search. Default: \['fact'].
