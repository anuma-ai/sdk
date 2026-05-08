# ReflectOptions

Defined in: [src/lib/memory/reflect.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#37)

## Extends

* [`RecallOptions`](RecallOptions.md)

## Properties

### apiKey

> **apiKey**: `string`

Defined in: [src/lib/memory/reflect.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#45)

Auth + endpoint for the answer LLM.

***

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memory/reflect.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#46)

***

### budget?

> `optional` **budget**: [`Budget`](../type-aliases/Budget.md)

Defined in: [src/lib/memory/types.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#72)

Search depth. Default: 'low'.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`budget`](RecallOptions.md#budget)

***

### conversationId?

> `optional` **conversationId**: `string`

Defined in: [src/lib/memory/types.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#80)

Restrict chunk search to one conversation. Chunk-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`conversationId`](RecallOptions.md#conversationid)

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

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`decomposeOptions`](RecallOptions.md#decomposeoptions)

***

### excludeConversationId?

> `optional` **excludeConversationId**: `string`

Defined in: [src/lib/memory/types.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#82)

Exclude one conversation from chunk search. Chunk-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`excludeConversationId`](RecallOptions.md#excludeconversationid)

***

### fetchFn()?

> `optional` **fetchFn**: {(`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>; }

Defined in: [src/lib/memory/reflect.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#48)

Override fetch (for tests).

**Call Signature**

> (`input`: `RequestInfo` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`input`

</td>
<td>

`RequestInfo` | `URL`

</td>
</tr>
<tr>
<td>

`init?`

</td>
<td>

`RequestInit`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Response`>

**Call Signature**

> (`input`: `string` | `Request` | `URL`, `init?`: `RequestInit`): `Promise`<`Response`>

[MDN Reference](https://developer.mozilla.org/docs/Web/API/Window/fetch)

**Parameters**

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`input`

</td>
<td>

`string` | `Request` | `URL`

</td>
</tr>
<tr>
<td>

`init?`

</td>
<td>

`RequestInit`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`Response`>

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#78)

Vault folder filter. Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`folderId`](RecallOptions.md#folderid)

***

### includeChunks?

> `optional` **includeChunks**: `boolean`

Defined in: [src/lib/memory/types.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#74)

Include source chunks for fact memories that have provenance. Default: false.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`includeChunks`](RecallOptions.md#includechunks)

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/lib/memory/types.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#68)

Max items returned. Default: 8.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`limit`](RecallOptions.md#limit)

***

### llmModel?

> `optional` **llmModel**: `string`

Defined in: [src/lib/memory/reflect.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#39)

Override the answer model. Default: anthropic/claude-sonnet-4-6.

***

### maxTokens?

> `optional` **maxTokens**: `number`

Defined in: [src/lib/memory/reflect.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#41)

Cap response length. Default: 4096.

**Overrides**

[`RecallOptions`](RecallOptions.md).[`maxTokens`](RecallOptions.md#maxtokens)

***

### minScore?

> `optional` **minScore**: `number`

Defined in: [src/lib/memory/types.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#84)

Drop results below this score. Default: 0.1 for facts, 0.5 for chunks (mirrors today's defaults).

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`minScore`](RecallOptions.md#minscore)

***

### responseSchema?

> `optional` **responseSchema**: `Record`<`string`, `unknown`>

Defined in: [src/lib/memory/reflect.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#50)

Optional JSON Schema to coerce structured outputs.

***

### scopes?

> `optional` **scopes**: `string`\[]

Defined in: [src/lib/memory/types.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#76)

Vault scope filter. Vault-only.

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`scopes`](RecallOptions.md#scopes)

***

### systemPrompt?

> `optional` **systemPrompt**: `string`

Defined in: [src/lib/memory/reflect.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/reflect.ts#43)

Override the grounding system prompt.

***

### types?

> `optional` **types**: [`MemoryKind`](../type-aliases/MemoryKind.md)\[]

Defined in: [src/lib/memory/types.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#66)

Which kinds to search. Default: \['fact'].

**Inherited from**

[`RecallOptions`](RecallOptions.md).[`types`](RecallOptions.md#types)
