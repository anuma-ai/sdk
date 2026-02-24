# migrateDriveToken

> **migrateDriveToken**(`walletAddress`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/auth/google-drive.ts:596](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/auth/google-drive.ts#L596)

Migrate unencrypted Drive tokens to encrypted storage.
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
