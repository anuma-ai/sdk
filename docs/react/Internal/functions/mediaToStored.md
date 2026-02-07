# mediaToStored

> **mediaToStored**(`media`: [`StoredMediaModel`](../classes/StoredMediaModel.md), `walletAddress?`: `string`, `signMessage?`: [`SignMessageFn`](../type-aliases/SignMessageFn.md), `embeddedWalletSigner?`: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)): `Promise`<[`StoredMedia`](../interfaces/StoredMedia.md)>

Defined in: [src/lib/db/media/operations.ts:60](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/media/operations.ts#L60)

Converts a Media model to StoredMedia, decrypting fields if encryption context is available.

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

`media`

</td>
<td>

[`StoredMediaModel`](../classes/StoredMediaModel.md)

</td>
</tr>
<tr>
<td>

`walletAddress?`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`signMessage?`

</td>
<td>

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

</td>
</tr>
<tr>
<td>

`embeddedWalletSigner?`

</td>
<td>

[`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredMedia`](../interfaces/StoredMedia.md)>
