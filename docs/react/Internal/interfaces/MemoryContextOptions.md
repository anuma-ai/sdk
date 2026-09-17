# MemoryContextOptions

Defined in: src/lib/memory/context.ts:15

## Properties

### includeEpisodes?

> `optional` **includeEpisodes**: `boolean`

Defined in: src/lib/memory/context.ts:27

***

### loadFacts?

> `optional` **loadFacts**: (`options`: { `factTypes?`: `string`\[]; `folderId?`: `string` | `null`; `includeArchived?`: `boolean`; `includeDeleted?`: `boolean`; `includeQuarantined?`: `boolean`; `includeSuperseded?`: `boolean`; `limit?`: `number`; `memoryIds?`: `string`\[]; `scopes?`: `string`\[]; `since?`: `Date`; `visibility?`: [`VaultMemoryVisibility`](../type-aliases/VaultMemoryVisibility.md)\[]; } | `undefined`) => `Promise`<[`StoredVaultMemory`](StoredVaultMemory.md)\[]> | `null`

Defined in: src/lib/memory/context.ts:18

***

### loadSessionRefs?

> `optional` **loadSessionRefs**: () => `Promise`<`object`\[]> | `null`

Defined in: src/lib/memory/context.ts:21

***

### maxChars?

> `optional` **maxChars**: `number`

Defined in: src/lib/memory/context.ts:26

Character budget for contents (formatting overhead is excluded). Default 12000.

***

### memoryIds?

> `optional` **memoryIds**: `string`\[]

Defined in: src/lib/memory/context.ts:24

Topic membership is applied before ranking and to every context lane.

***

### onDegraded()?

> `optional` **onDegraded**: (`lane`: [`MemoryContextLane`](../type-aliases/MemoryContextLane.md), `error`: `unknown`) => `void`

Defined in: src/lib/memory/context.ts:28

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

Defined in: src/lib/memory/context.ts:16

***

### recall()

> **recall**: (`query`: `string`, `options`: [`RecallOptions`](RecallOptions.md)) => `Promise`<[`RecallResult`](RecallResult.md)>

Defined in: src/lib/memory/context.ts:17

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

Defined in: src/lib/memory/context.ts:22
