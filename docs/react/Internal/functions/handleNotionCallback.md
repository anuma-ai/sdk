# handleNotionCallback

> **handleNotionCallback**(`callbackPath`: `string`, `walletAddress`: `string` | `undefined`): `Promise`<`string` | `null`>

Defined in: [src/lib/auth/notion.ts:722](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/auth/notion.ts#L722)

Handle the OAuth callback - exchange code for tokens
This is done directly with Notion (no backend needed due to PKCE)

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

The callback path used during authorization

</td>
</tr>
<tr>
<td>

`walletAddress`

</td>
<td>

`string` | `undefined`

</td>
<td>

Wallet address for token encryption (optional)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string` | `null`>
