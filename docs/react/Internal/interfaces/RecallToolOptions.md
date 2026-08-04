# RecallToolOptions

Defined in: [src/lib/memory/recallTool.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#36)

## Properties

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/recallTool.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#42)

Retrieval depth. Default: "low".

***

### decomposeOptions?

> `optional` **decomposeOptions**: [`PortalLlmAuth`](PortalLlmAuth.md) & `object`

Defined in: [src/lib/memory/recallTool.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#68)

LLM-decompose options; only used at budget="high". Runs in THIS tool
executor (719/B4) — `recall()` itself is LLM-free. Auth follows the
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

Defined in: [src/lib/memory/recallTool.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#63)

Exclude one conversation from chunk results (typically the active one).

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/recallTool.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#48)

Vault folder filter.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/recallTool.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#40)

Max items returned to the LLM. Default: 8.

***

### memoryIds?

> `optional` **memoryIds**: readonly `string`\[]

Defined in: [src/lib/memory/recallTool.ts:61](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#61)

Restrict the fact lane to these vault ids — a host-imposed candidate set,
applied at load time so ranking and top-K run inside it. There is no
LLM-facing equivalent, so the model can neither widen nor escape it.

Setting this also drops the chunk lane (see
[RecallOptions.memoryIds](RecallOptions.md#memoryids)); with the default
`types: ["fact", "chunk"]` that means this tool returns facts only while a
scope is set, which is the only honest answer an id allow-list can give.

An EMPTY array admits nothing; omit for no filter.

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/recallTool.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#44)

Min score threshold. Defaults to recall()'s per-lane defaults.

***

### now?

> `optional` **now**: `number`

Defined in: [src/lib/memory/recallTool.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#77)

Reference "now" for resolving relative temporal phrases in the
query ("last week", "yesterday", "N days ago"). Default: `Date.now()`.
Override for back-dated bench harnesses, replay tools, or
deterministic tests — otherwise the W6 lane resolves windows
against wall-clock today, which is wrong for any historical dataset.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/recallTool.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#46)

Vault scope filter.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/recallTool.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recallTool.ts#38)

Lanes to search. Default: \["fact", "chunk"].
