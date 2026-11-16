# RemoteMemoryStoreOptions

Defined in: [src/lib/memory/store/remoteStore.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#78)

## Properties

### activity?

> `optional` **activity**: `object`

Defined in: [src/lib/memory/store/remoteStore.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#85)

**isActive()**

> **isActive**: () => `boolean`

**Returns**

`boolean`

**subscribe()**

> **subscribe**: (`onChange`: () => `void`) => () => `void`

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

`onChange`

</td>
<td>

() => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

> (): `void`

**Returns**

`void`

***

### embeddingOptions

> **embeddingOptions**: [`MemoryEngineEmbeddingOptions`](MemoryEngineEmbeddingOptions.md)

Defined in: [src/lib/memory/store/remoteStore.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#80)

***

### graphRanking()?

> `optional` **graphRanking**: (`query`: `string`, `traverse`: `boolean`, `options`: [`RecallOptions`](RecallOptions.md)) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remoteStore.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#82)

Defaults to ranking memories by how many query entities their topics name.

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

`traverse`

</td>
<td>

`boolean`

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

`Promise`<`string`\[]>

***

### persistence

> **persistence**: [`RemoteMemoryPersistence`](RemoteMemoryPersistence.md)

Defined in: [src/lib/memory/store/remoteStore.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#79)

***

### pollIntervalMs?

> `optional` **pollIntervalMs**: `number`

Defined in: [src/lib/memory/store/remoteStore.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#84)

***

### subscribeChanges()?

> `optional` **subscribeChanges**: (`onChange`: (`connected`: `boolean`) => `void`) => () => `void`

Defined in: [src/lib/memory/store/remoteStore.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#90)

Report connection state on subscribe/reconnect and true on each account memory change.

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

`onChange`

</td>
<td>

(`connected`: `boolean`) => `void`

</td>
</tr>
</tbody>
</table>

**Returns**

> (): `void`

**Returns**

`void`

***

### temporalRanking()?

> `optional` **temporalRanking**: (`query`: `string`, `now?`: `number`) => `Promise`<`string`\[]>

Defined in: [src/lib/memory/store/remoteStore.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteStore.ts#83)

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

`now?`

</td>
<td>

`number`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`\[]>
