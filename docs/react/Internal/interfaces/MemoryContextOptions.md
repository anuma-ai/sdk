# MemoryContextOptions

Defined in: [src/lib/memory/context.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#24)

## Properties

### includeEpisodes?

> `optional` **includeEpisodes**: `boolean`

Defined in: [src/lib/memory/context.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#38)

***

### loadFacts?

> `optional` **loadFacts**: (`options`: { `excludeDisabled?`: `boolean`; `factTypes?`: `string`\[]; `folderId?`: `string` | `null`; `includeArchived?`: `boolean`; `includeDeleted?`: `boolean`; `includeQuarantined?`: `boolean`; `includeSuperseded?`: `boolean`; `kinds?`: `string`\[]; `levels?`: (`"private"` | `"matching"` | `"profile"`)\[]; `limit?`: `number`; `memoryIds?`: `string`\[]; `scopes?`: `string`\[]; `since?`: `Date`; `visibility?`: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)\[]; `withEmbeddings?`: `boolean`; } | `undefined`) => `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]> | `null`

Defined in: [src/lib/memory/context.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#27)

***

### loadSessionRefs?

> `optional` **loadSessionRefs**: () => `Promise`<`object`\[]> | `null`

Defined in: [src/lib/memory/context.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#30)

***

### maxChars?

> `optional` **maxChars**: `number`

Defined in: [src/lib/memory/context.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#37)

Character budget for contents (formatting overhead is excluded). Default 12000.

***

### memoryIds?

> `optional` **memoryIds**: `string`\[]

Defined in: [src/lib/memory/context.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#35)

Topic membership is applied before ranking and to every context lane.

***

### onDegraded()?

> `optional` **onDegraded**: (`lane`: [`MemoryContextLane`](../type-aliases/MemoryContextLane.md), `error`: `unknown`) => `void`

Defined in: [src/lib/memory/context.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#39)

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

`lane`

</td>
<td>

[`MemoryContextLane`](../type-aliases/MemoryContextLane.md)

</td>
</tr>
<tr>
<td>

`error`

</td>
<td>

`unknown`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

***

### profile?

> `optional` **profile**: [`MemoryAppProfile`](MemoryAppProfile.md)

Defined in: [src/lib/memory/context.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#33)

App profile passed to both recall lanes; a `recallOptions.profile` wins.

***

### query

> **query**: `string`

Defined in: [src/lib/memory/context.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#25)

***

### recall()

> **recall**: (`query`: `string`, `options`: [`RecallOptions`](RecallOptions.md)) => `Promise`<[`RecallResult`](RecallResult.md)>

Defined in: [src/lib/memory/context.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#26)

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

`query`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`RecallOptions`](RecallOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RecallResult`](RecallResult.md)>

***

### recallOptions?

> `optional` **recallOptions**: [`RecallOptions`](RecallOptions.md)

Defined in: [src/lib/memory/context.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#31)
