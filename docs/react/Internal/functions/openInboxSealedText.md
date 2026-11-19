# openInboxSealedText

> **openInboxSealedText**(`options`: `object`, `sealed`: `string`, `sealId`: `string`): `Promise`<`string`>

Defined in: [src/lib/chat/inbox.ts:164](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/inbox.ts#164)

Open text that portal sealed to the wallet's inbox key under a seal id.

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

`options`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.embeddedWalletSigner?`

</td>
<td>

[`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

</td>
</tr>
<tr>
<td>

`options.signMessage?`

</td>
<td>

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

</td>
</tr>
<tr>
<td>

`options.walletAddress`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`sealed`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`sealId`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`>
