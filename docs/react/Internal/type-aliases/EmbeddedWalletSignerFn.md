# EmbeddedWalletSignerFn

> **EmbeddedWalletSignerFn** = (`message`: `string`, `options?`: [`SignMessageOptions`](../interfaces/SignMessageOptions.md)) => `Promise`<`string`>

Defined in: [src/react/useEncryption.ts:787](https://github.com/anuma-ai/sdk/blob/main/src/react/useEncryption.ts#787)

Type for embedded wallet signer function that enables silent signing.
For Privy embedded wallets, this can sign programmatically without user interaction
when configured correctly in the Privy dashboard.

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

`message`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options?`

</td>
<td>

[`SignMessageOptions`](../interfaces/SignMessageOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>
