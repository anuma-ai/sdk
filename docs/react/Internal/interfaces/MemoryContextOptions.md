# MemoryContextOptions

Defined in: [src/lib/memory/context.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#23)

## Properties

### includeEpisodes?

> `optional` **includeEpisodes**: `boolean`

Defined in: [src/lib/memory/context.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#35)

***

### loadFacts?

> `optional` **loadFacts**: (`options`: { `factTypes?`: `string`\[]; `folderId?`: `string` | `null`; `includeArchived?`: `boolean`; `includeDeleted?`: `boolean`; `includeQuarantined?`: `boolean`; `includeSuperseded?`: `boolean`; `kinds?`: `string`\[]; `levels?`: (`"profile"` | `"private"` | `"matching"`)\[]; `limit?`: `number`; `memoryIds?`: `string`\[]; `scopes?`: `string`\[]; `since?`: `Date`; `visibility?`: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)\[]; } | `undefined`) => `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]> | `null`

Defined in: [src/lib/memory/context.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#26)

***

### loadSessionRefs?

> `optional` **loadSessionRefs**: () => `Promise`<`object`\[]> | `null`

Defined in: [src/lib/memory/context.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#29)

***

### maxChars?

> `optional` **maxChars**: `number`

Defined in: [src/lib/memory/context.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#34)

Character budget for contents (formatting overhead is excluded). Default 12000.

***

### memoryIds?

> `optional` **memoryIds**: `string`\[]

Defined in: [src/lib/memory/context.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#32)

Topic membership is applied before ranking and to every context lane.

***

### onDegraded()?

> `optional` **onDegraded**: (`lane`: [`MemoryContextLane`](../type-aliases/MemoryContextLane.md), `error`: `unknown`) => `void`

Defined in: [src/lib/memory/context.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#36)

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

### query

> **query**: `string`

Defined in: [src/lib/memory/context.ts:24](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#24)

***

### recall()

> **recall**: (`query`: `string`, `options`: [`RecallOptions`](RecallOptions.md)) => `Promise`<[`RecallResult`](RecallResult.md)>

Defined in: [src/lib/memory/context.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#25)

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

Defined in: [src/lib/memory/context.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/context.ts#30)
