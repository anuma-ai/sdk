# startNotionAuth

> **startNotionAuth**(`callbackPath`: `string`): `Promise`<`never`>

Defined in: [src/lib/auth/notion.ts:496](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/auth/notion.ts#L496)

Start the Notion OAuth flow with PKCE and Dynamic Client Registration
Redirects to Notion authorization page

No client ID needed - uses dynamic registration (RFC 7591)

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

`callbackPath`

</td>
<td>

`string`

</td>
<td>

The path for OAuth callback (e.g., "/auth/notion/callback")

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`never`>
