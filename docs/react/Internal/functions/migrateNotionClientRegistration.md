# migrateNotionClientRegistration

> **migrateNotionClientRegistration**(`walletAddress`: `string`): `Promise`<`boolean`>

Defined in: [src/lib/auth/notion.ts:519](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/auth/notion.ts#L519)

Migrate unencrypted client registration to encrypted format.
Call this when wallet/encryption key becomes available.

Checks two sources:

1. sessionStorage fallback (from startNotionAuth when wallet was unavailable)
2. Legacy plain-text localStorage (from before encryption was added)

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
