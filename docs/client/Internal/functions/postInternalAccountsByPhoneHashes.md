# postInternalAccountsByPhoneHashes

> **postInternalAccountsByPhoneHashes**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostInternalAccountsByPhoneHashesData`](../type-aliases/PostInternalAccountsByPhoneHashesData.md), `ThrowOnError`>): `RequestResult`<[`PostInternalAccountsByPhoneHashesResponses`](../type-aliases/PostInternalAccountsByPhoneHashesResponses.md), [`PostInternalAccountsByPhoneHashesErrors`](../type-aliases/PostInternalAccountsByPhoneHashesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1686](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1686)

Resolve phone hashes to account IDs (batch)

Internal server-to-service endpoint used by the nearby service for contact matching. Takes a batch of peppered phone hashes (HMAC-SHA256, base64) and returns the account IDs of accounts holding them, for verified accounts only. Non-matching hashes are absent from the response. Submitted hashes are never logged or persisted. Applies no discoverability filter — the caller owns that consent flag. Rate-limited on top of the shared X-Service-Key.

## Type Parameters

<table>
<thead>
<tr>
<th>Type Parameter</th>
<th>Default type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`ThrowOnError` *extends* `boolean`

</td>
<td>

`false`

</td>
</tr>
</tbody>
</table>

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

[`Options`](../type-aliases/Options.md)<[`PostInternalAccountsByPhoneHashesData`](../type-aliases/PostInternalAccountsByPhoneHashesData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostInternalAccountsByPhoneHashesResponses`](../type-aliases/PostInternalAccountsByPhoneHashesResponses.md), [`PostInternalAccountsByPhoneHashesErrors`](../type-aliases/PostInternalAccountsByPhoneHashesErrors.md), `ThrowOnError`>
