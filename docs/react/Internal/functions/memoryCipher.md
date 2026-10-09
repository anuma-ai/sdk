# memoryCipher

> **memoryCipher**(`canonical`: [`MemoryKeyRing`](../interfaces/MemoryKeyRing.md)): `object`

Defined in: [src/lib/memory/store/memoryKeys.ts:79](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/memoryKeys.ts#79)

Encrypt and decrypt callbacks for `createRemoteMemoryPersistence` under the canonical key.

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

`canonical`

</td>
<td>

[`MemoryKeyRing`](../interfaces/MemoryKeyRing.md)

</td>
</tr>
</tbody>
</table>

## Returns

`object`

### decrypt()

> **decrypt**: (`ciphertext`: `string`) => `Promise`<`string`>

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

`ciphertext`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`>

### encrypt()

> **encrypt**: (`plaintext`: `string`) => `Promise`<`string`>

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

`plaintext`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`string`>
