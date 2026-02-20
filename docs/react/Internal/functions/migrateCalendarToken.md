# migrateCalendarToken

> **migrateCalendarToken**(`walletAddress`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/auth/google-calendar.ts:594](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/auth/google-calendar.ts#L594)

Migrate unencrypted Calendar tokens to encrypted wallet-scoped storage.
Call this when a wallet address and encryption key become available
after the initial OAuth flow.

Returns true if migration was performed (or already complete), false otherwise.

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
