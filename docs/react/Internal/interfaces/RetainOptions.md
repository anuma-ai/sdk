# RetainOptions

Defined in: [src/lib/memory/types.ts:162](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#162)

## Properties

### autoMergeThreshold?

> `optional` **autoMergeThreshold**: `number`

Defined in: [src/lib/memory/types.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#170)

Cosine similarity threshold for auto-merge. Default: 0.85.

***

### consolidateOptions?

> `optional` **consolidateOptions**: `object`

Defined in: [src/lib/memory/types.ts:177](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#177)

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

**onFallback()?**

> `optional` **onFallback**: (`reason`: [`ConsolidationFallbackReason`](../type-aliases/ConsolidationFallbackReason.md)) => `void`

Invoked when the consolidator degrades to its "create" fallback
instead of returning a real decision — `llm_error` for network /
timeout / unparseable output, `invalid_response` for well-formed
JSON that violates the schema (unknown action, bad targetId).
A flaky consolidator silently accumulates duplicate memories;
wire this to logging/metrics so the fallback rate is observable.

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

`reason`

</td>
<td>

[`ConsolidationFallbackReason`](../type-aliases/ConsolidationFallbackReason.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### consolidateThreshold?

> `optional` **consolidateThreshold**: `number`

Defined in: [src/lib/memory/types.ts:192](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#192)

Cosine similarity floor for the consolidator candidate set. Default: 0.65.

***

### consolidateTopK?

> `optional` **consolidateTopK**: `number`

Defined in: [src/lib/memory/types.ts:194](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#194)

Top-K consolidation candidates to feed the LLM. Default: 5.

***

### enableAutoMerge?

> `optional` **enableAutoMerge**: `boolean`

Defined in: [src/lib/memory/types.ts:168](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#168)

When provided, applies merge-on-write logic instead of plain insert.

***

### eventTime?

> `optional` **eventTime**: { `end`: `number` | `null`; `kind`: `"point"` | `"range"` | `"ongoing"`; `start`: `number`; } | `null`

Defined in: [src/lib/memory/types.ts:201](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#201)

W6 temporal lane — when the event in this fact occurred. Persisted to
memory\_vault.event\_time\_\* columns; recall's temporal lane filters
and boosts memories whose event-time overlaps the query window.
Auto-extraction emits this; manual writes can omit it.

***

### folderId?

> `optional` **folderId**: `string` | `null`

Defined in: [src/lib/memory/types.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#166)

***

### scope?

> `optional` **scope**: `string`

Defined in: [src/lib/memory/types.ts:165](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#165)

***

### source?

> `optional` **source**: [`RetainSource`](../type-aliases/RetainSource.md)

Defined in: [src/lib/memory/types.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#163)

***

### sourceChunkIds?

> `optional` **sourceChunkIds**: `string`\[]

Defined in: [src/lib/memory/types.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/types.ts#164)
