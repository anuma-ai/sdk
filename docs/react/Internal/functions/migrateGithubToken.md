# migrateGithubToken

> **migrateGithubToken**(`walletAddress`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/auth/github.ts:575](https://github.com/anuma-ai/sdk/blob/main/src/lib/auth/github.ts#575)

Migrate unencrypted GitHub tokens to encrypted storage.
Call this when a wallet address and encryption key become available
after the initial OAuth flow.

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>

true if migration occurred, false otherwise
