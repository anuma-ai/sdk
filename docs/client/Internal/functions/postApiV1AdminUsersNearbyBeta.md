# postApiV1AdminUsersNearbyBeta

> **postApiV1AdminUsersNearbyBeta**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminUsersNearbyBetaData`](../type-aliases/PostApiV1AdminUsersNearbyBetaData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminUsersNearbyBetaResponses`](../type-aliases/PostApiV1AdminUsersNearbyBetaResponses.md), [`PostApiV1AdminUsersNearbyBetaErrors`](../type-aliases/PostApiV1AdminUsersNearbyBetaErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:588](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#588)

Grant or revoke People Nearby beta admission for an account

Sets or clears People Nearby beta admission on one account, independently of any access code. `grant` is REQUIRED (true to grant, false to revoke); omitting it is a 400. Takes up to ~60s to take effect in nearby, which caches the resolved session. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminUsersNearbyBetaData`](../type-aliases/PostApiV1AdminUsersNearbyBetaData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminUsersNearbyBetaResponses`](../type-aliases/PostApiV1AdminUsersNearbyBetaResponses.md), [`PostApiV1AdminUsersNearbyBetaErrors`](../type-aliases/PostApiV1AdminUsersNearbyBetaErrors.md), `ThrowOnError`>
