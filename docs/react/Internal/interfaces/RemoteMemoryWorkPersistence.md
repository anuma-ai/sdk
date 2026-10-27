# RemoteMemoryWorkPersistence

Defined in: [src/lib/memory/store/remoteWork.ts:16](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteWork.ts#16)

## Extended by

* [`RemoteMemoryPersistence`](RemoteMemoryPersistence.md)

## Methods

### claimWork()

> **claimWork**(`kind`: [`RemoteMemoryWorkKind`](../type-aliases/RemoteMemoryWorkKind.md), `processorVersion`: `string`, `token?`: `string`): `Promise`<[`RemoteMemoryWorkLease`](RemoteMemoryWorkLease.md) | `null`>

Defined in: [src/lib/memory/store/remoteWork.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteWork.ts#17)

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

`kind`

</td>
<td>

[`RemoteMemoryWorkKind`](../type-aliases/RemoteMemoryWorkKind.md)

</td>
</tr>
<tr>
<td>

`processorVersion`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`token?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`RemoteMemoryWorkLease`](RemoteMemoryWorkLease.md) | `null`>

***

### releaseWork()

> **releaseWork**(`kind`: [`RemoteMemoryWorkKind`](../type-aliases/RemoteMemoryWorkKind.md), `token`: `string`): `Promise`<`void`>

Defined in: [src/lib/memory/store/remoteWork.ts:22](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/remoteWork.ts#22)

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

`kind`

</td>
<td>

[`RemoteMemoryWorkKind`](../type-aliases/RemoteMemoryWorkKind.md)

</td>
</tr>
<tr>
<td>

`token`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>
