# onKeyAvailable

> **onKeyAvailable**(`address`: `string`, `callback`: () => `void`): () => `void`

Defined in: [src/react/useEncryption.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#60)

Register a callback that fires when an encryption key becomes available for an address.
If the key is already available, the callback fires immediately.

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

`address`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`callback`

</td>
<td>

() => `void`

</td>
</tr>
</tbody>
</table>

## Returns

Unsubscribe function

> (): `void`

### Returns

`void`
