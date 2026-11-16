# VaultRealtime

Defined in: [src/lib/vaultRealtime.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/vaultRealtime.ts#36)

One account's vault realtime socket, shared by its memory store and chat backend.

## Methods

### changes()

> **changes**(`entities`: readonly [`VaultRealtimeEntity`](../type-aliases/VaultRealtimeEntity.md)\[]): (`onChange`: (`connected`: `boolean`) => `void`) => () => `void`

Defined in: [src/lib/vaultRealtime.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/lib/vaultRealtime.ts#38)

A `subscribeChanges` for the given entities: reports the connection state on subscribe and on every connect and disconnect, and `true` on each marker for one of them.

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

`entities`

</td>
<td>

readonly [`VaultRealtimeEntity`](../type-aliases/VaultRealtimeEntity.md)\[]

</td>
</tr>
</tbody>
</table>

**Returns**

> (`onChange`: (`connected`: `boolean`) => `void`): () => `void`

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

### close()

> **close**(): `void`

Defined in: [src/lib/vaultRealtime.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/vaultRealtime.ts#41)

**Returns**

`void`
