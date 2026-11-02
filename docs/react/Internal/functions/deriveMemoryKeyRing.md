# deriveMemoryKeyRing

> **deriveMemoryKeyRing**(`signatureHex`: `string`): `Promise`<[`MemoryKeyRing`](../interfaces/MemoryKeyRing.md)>

Defined in: [src/lib/memory/store/memoryKeys.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/memoryKeys.ts#74)

Derive the v3 and legacy v2 memory keys and the topic HMAC key from a hex wallet signature.

## Parameters

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

`signatureHex`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`MemoryKeyRing`](../interfaces/MemoryKeyRing.md)>
