# getApiV1AdminNearbyAccessCodes

> **getApiV1AdminNearbyAccessCodes**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1AdminNearbyAccessCodesData`](../type-aliases/GetApiV1AdminNearbyAccessCodesData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1AdminNearbyAccessCodesResponses`](../type-aliases/GetApiV1AdminNearbyAccessCodesResponses.md), [`GetApiV1AdminNearbyAccessCodesErrors`](../type-aliases/GetApiV1AdminNearbyAccessCodesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:285](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#285)

List People Nearby beta access codes

Every code, newest first, with its cap, redemption count, expiry and revocation state. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1AdminNearbyAccessCodesData`](../type-aliases/GetApiV1AdminNearbyAccessCodesData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1AdminNearbyAccessCodesResponses`](../type-aliases/GetApiV1AdminNearbyAccessCodesResponses.md), [`GetApiV1AdminNearbyAccessCodesErrors`](../type-aliases/GetApiV1AdminNearbyAccessCodesErrors.md), `ThrowOnError`>
