# reencryptMemoryField

> **reencryptMemoryField**(`value`: `string`, `canonical`: [`MemoryKeyRing`](../interfaces/MemoryKeyRing.md), `fallbacks`: readonly [`MemoryKeyRing`](../interfaces/MemoryKeyRing.md)\[]): `Promise`<`string`>

Defined in: [src/lib/memory/store/memoryKeys.ts:98](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/memoryKeys.ts#98)

Re-encrypt a local field under the canonical key.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`value`

</td>
<td>

`string`

</td>
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`canonical`

</td>
<td>

[`MemoryKeyRing`](../interfaces/MemoryKeyRing.md)

</td>
<td>

`undefined`

</td>
</tr>
<tr>
<td>

`fallbacks`

</td>
<td>

readonly [`MemoryKeyRing`](../interfaces/MemoryKeyRing.md)\[]

</td>
<td>

`[]`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>

## Throws

MemoryKeyError when no key decrypts the field.
