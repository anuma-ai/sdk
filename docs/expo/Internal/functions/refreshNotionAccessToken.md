# refreshNotionAccessToken

> **refreshNotionAccessToken**(`params`: [`NotionRefreshTokenParams`](../interfaces/NotionRefreshTokenParams.md)): `Promise`<[`NotionTokenResponse`](../interfaces/NotionTokenResponse.md)>

Defined in: [src/lib/auth/notion-primitives.ts:359](https://github.com/anuma-ai/sdk/blob/main/src/lib/auth/notion-primitives.ts#359)

Refresh an access token using a refresh token.

This is a **public client** request — no `client_secret` is sent.

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

[`NotionRefreshTokenParams`](../interfaces/NotionRefreshTokenParams.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`NotionTokenResponse`](../interfaces/NotionTokenResponse.md)>
