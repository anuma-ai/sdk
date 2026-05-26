# RecallToolOptions

Defined in: [src/lib/memory/recallTool.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#25)

## Properties

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/recallTool.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#31)

Retrieval depth. Default: "low".

***

### decomposeOptions?

> `optional` **decomposeOptions**: `object`

Defined in: [src/lib/memory/recallTool.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#41)

LLM-decompose options; only used at budget="high".

**apiKey**

> **apiKey**: `string`

**baseUrl?**

> `optional` **baseUrl**: `string`

**model?**

> `optional` **model**: `string`

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/recallTool.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#39)

Exclude one conversation from chunk results (typically the active one).

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/recallTool.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#37)

Vault folder filter.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/recallTool.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#29)

Max items returned to the LLM. Default: 8.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/recallTool.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#33)

Min score threshold. Defaults to recall()'s per-lane defaults.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/recallTool.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#35)

Vault scope filter.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/recallTool.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#27)

Lanes to search. Default: \["fact", "chunk"].
