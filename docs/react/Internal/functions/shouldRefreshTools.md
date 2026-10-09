# shouldRefreshTools

## Call Signature

> **shouldRefreshTools**(`responseChecksum`: `string` | `undefined`): `boolean`

Defined in: [src/lib/tools/serverTools.ts:365](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#365)

Check if tools should be refreshed based on checksum comparison.
Returns true if:

* responseChecksum is provided and differs from cached checksum
* No cached checksum exists (first time with checksum support)

Returns false if:

* responseChecksum is not provided (legacy response)
* Checksums match

### Parameters

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

`responseChecksum`

</td>
<td>

`string` | `undefined`

</td>
</tr>
</tbody>
</table>

### Returns

`boolean`

## Call Signature

> **shouldRefreshTools**(`responseChecksum`: `string` | `undefined`, `cache`: `ToolsCacheBackend` | `undefined`): `boolean` | `Promise`<`boolean`>

Defined in: [src/lib/tools/serverTools.ts:366](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#366)

Check if tools should be refreshed based on checksum comparison.
Returns true if:

* responseChecksum is provided and differs from cached checksum
* No cached checksum exists (first time with checksum support)

Returns false if:

* responseChecksum is not provided (legacy response)
* Checksums match

### Parameters

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

`responseChecksum`

</td>
<td>

`string` | `undefined`

</td>
</tr>
<tr>
<td>

`cache`

</td>
<td>

`ToolsCacheBackend` | `undefined`

</td>
</tr>
</tbody>
</table>

### Returns

`boolean` | `Promise`<`boolean`>
