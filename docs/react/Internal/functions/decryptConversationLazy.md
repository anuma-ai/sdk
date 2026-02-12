# decryptConversationLazy

> **decryptConversationLazy**(`conversation`: [`StoredConversation`](../interfaces/StoredConversation.md), `walletAddress`: `string`, `signMessage?`: [`SignMessageFn`](../type-aliases/SignMessageFn.md), `embeddedWalletSigner?`: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)): `Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)>

Defined in: [src/lib/db/chat/lazyDecryption.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/chat/lazyDecryption.ts#L69)

Decrypt a single conversation on-demand with caching.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`conversation`

</td>
<td>

[`StoredConversation`](../interfaces/StoredConversation.md)

</td>
<td>

The raw (potentially encrypted) conversation

</td>
</tr>
<tr>
<td>

`walletAddress`

</td>
<td>

`string`

</td>
<td>

The wallet address for decryption

</td>
</tr>
<tr>
<td>

`signMessage?`

</td>
<td>

[`SignMessageFn`](../type-aliases/SignMessageFn.md)

</td>
<td>

Optional sign message function

</td>
</tr>
<tr>
<td>

`embeddedWalletSigner?`

</td>
<td>

[`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

</td>
<td>

Optional embedded wallet signer

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`StoredConversation`](../interfaces/StoredConversation.md)>

Decrypted conversation
