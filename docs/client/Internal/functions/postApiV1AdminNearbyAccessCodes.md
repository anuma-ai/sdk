# postApiV1AdminNearbyAccessCodes

> **postApiV1AdminNearbyAccessCodes**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminNearbyAccessCodesData`](../type-aliases/PostApiV1AdminNearbyAccessCodesData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminNearbyAccessCodesResponses`](../type-aliases/PostApiV1AdminNearbyAccessCodesResponses.md), [`PostApiV1AdminNearbyAccessCodesErrors`](../type-aliases/PostApiV1AdminNearbyAccessCodesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:292](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#292)

Create a People Nearby beta access code

Mints an access code that admits accounts to the People Nearby beta. `max_redemptions` is required and capped; `expires_at` is optional but recommended. The code is normalized (upper-cased, non-alphanumerics stripped) before storage and the normalized form is returned — send that to testers. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminNearbyAccessCodesData`](../type-aliases/PostApiV1AdminNearbyAccessCodesData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminNearbyAccessCodesResponses`](../type-aliases/PostApiV1AdminNearbyAccessCodesResponses.md), [`PostApiV1AdminNearbyAccessCodesErrors`](../type-aliases/PostApiV1AdminNearbyAccessCodesErrors.md), `ThrowOnError`>
