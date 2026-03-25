# exchangeNotionCode

> **exchangeNotionCode**(`params`: [`NotionExchangeCodeParams`](../interfaces/NotionExchangeCodeParams.md)): `Promise`<[`NotionTokenResponse`](../interfaces/NotionTokenResponse.md)>

Defined in: [src/lib/auth/notion-primitives.ts:323](https://github.com/anuma-ai/sdk/blob/main/src/lib/auth/notion-primitives.ts#323)

Exchange an authorization code for tokens.

This is a **public client** request — no `client_secret` is sent.
The `code_verifier` proves possession of the original challenge.

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

`params`

</td>
<td>

[`NotionExchangeCodeParams`](../interfaces/NotionExchangeCodeParams.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`NotionTokenResponse`](../interfaces/NotionTokenResponse.md)>
