# RecallToolOptions

Defined in: [src/lib/memory/recallTool.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#30)

## Properties

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/recallTool.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#36)

Retrieval depth. Default: "low".

***

### decomposeOptions?

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memory/recallTool.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#48)

LLM-decompose options; only used at budget="high". Auth follows the
dual pattern: apiKey (server/CLI) or getToken (browser identity
tokens) — at least one required.

**Type Declaration**

**baseUrl?**

> `optional` **baseUrl**: `string`

**model?**

> `optional` **model**: `string`

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/recallTool.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#44)

Exclude one conversation from chunk results (typically the active one).

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/recallTool.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#42)

Vault folder filter.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/recallTool.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#34)

Max items returned to the LLM. Default: 8.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/recallTool.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#38)

Min score threshold. Defaults to recall()'s per-lane defaults.

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/recallTool.ts:57](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#57)

Reference "now" for resolving relative temporal phrases in the
query ("last week", "yesterday", "N days ago"). Default: `Date.now()`.
Override for back-dated bench harnesses, replay tools, or
deterministic tests — otherwise the W6 lane resolves windows
against wall-clock today, which is wrong for any historical dataset.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/recallTool.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#40)

Vault scope filter.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/recallTool.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#32)

Lanes to search. Default: \["fact", "chunk"].
