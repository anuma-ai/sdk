# postNearbyAccessCode

> **postNearbyAccessCode**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostNearbyAccessCodeData`](../type-aliases/PostNearbyAccessCodeData.md), `ThrowOnError`>): `RequestResult`<[`PostNearbyAccessCodeResponses`](../type-aliases/PostNearbyAccessCodeResponses.md), [`PostNearbyAccessCodeErrors`](../type-aliases/PostNearbyAccessCodeErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1882](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1882)

Redeem a People Nearby beta access code

Admits the calling account to the People Nearby beta. Idempotent: a repeat submit by an already-admitted account succeeds and consumes no seat. `invalid_code` is returned for both an unknown code and a mistyped one; `code_expired`, `code_exhausted` and `code_revoked` are distinct so the client can explain what happened.

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

[`Options`](../type-aliases/Options.md)<[`PostNearbyAccessCodeData`](../type-aliases/PostNearbyAccessCodeData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostNearbyAccessCodeResponses`](../type-aliases/PostNearbyAccessCodeResponses.md), [`PostNearbyAccessCodeErrors`](../type-aliases/PostNearbyAccessCodeErrors.md), `ThrowOnError`>
