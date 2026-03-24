# refreshGithubToken

> **refreshGithubToken**(`apiClient?`: `Client`, `walletAddress?`: `string`): `Promise`<`string` | `null`>

Defined in: [src/lib/auth/github.ts:379](https://github.com/anuma-ai/sdk/blob/main/src/lib/auth/github.ts#379)

Refresh the access token using the stored refresh token.
Note: GitHub OAuth tokens may not have refresh tokens (non-expiring tokens).

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

`apiClient?`

</td>
<td>

`Client`

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
</tbody>
</table>

## Returns

`Promise`<`string` | `null`>
