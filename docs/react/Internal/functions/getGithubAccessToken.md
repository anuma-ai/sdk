# getGithubAccessToken

> **getGithubAccessToken**(`apiClient?`: `Client`, `walletAddress?`: `string`): `Promise`<`string` | `null`>

Defined in: [src/lib/auth/github.ts:443](https://github.com/anuma-ai/sdk/blob/main/src/lib/auth/github.ts#443)

Get a valid access token, refreshing if necessary.
GitHub tokens may not expire — if no expiry is set, the stored token
is returned directly without attempting a refresh.

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
