# postApiV1AdminNearbyAccessCodesRevoke

> **postApiV1AdminNearbyAccessCodesRevoke**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminNearbyAccessCodesRevokeData`](../type-aliases/PostApiV1AdminNearbyAccessCodesRevokeData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminNearbyAccessCodesRevokeResponses`](../type-aliases/PostApiV1AdminNearbyAccessCodesRevokeResponses.md), [`PostApiV1AdminNearbyAccessCodesRevokeErrors`](../type-aliases/PostApiV1AdminNearbyAccessCodesRevokeErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:306](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#306)

Revoke or un-revoke a People Nearby beta access code

Stops a code from admitting anyone else, without deleting it or affecting accounts already admitted. `revoked` is REQUIRED (true to revoke, false to restore); omitting it is a 400 rather than a silent restore. Requires admin API key.

## Type Parameters

<table>
<thead>
<tr>
<th>Type Parameter</th>
<th>Default type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`ThrowOnError` *extends* `boolean`

</td>
<td>

`false`

</td>
</tr>
</tbody>
</table>

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

`options`

</td>
<td>

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminNearbyAccessCodesRevokeData`](../type-aliases/PostApiV1AdminNearbyAccessCodesRevokeData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminNearbyAccessCodesRevokeResponses`](../type-aliases/PostApiV1AdminNearbyAccessCodesRevokeResponses.md), [`PostApiV1AdminNearbyAccessCodesRevokeErrors`](../type-aliases/PostApiV1AdminNearbyAccessCodesRevokeErrors.md), `ThrowOnError`>
