# getNearbyAccess

> **getNearbyAccess**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetNearbyAccessData`](../type-aliases/GetNearbyAccessData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`GetNearbyAccessResponses`](../type-aliases/GetNearbyAccessResponses.md), [`GetNearbyAccessErrors`](../type-aliases/GetNearbyAccessErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1875](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1875)

Read People Nearby beta admission for the caller

Whether this account has been admitted to the People Nearby beta. Reports the beta grant only — an internal-tester account that nearby would also admit reads `granted: false` here, because which grants open that gate is nearby's policy rather than the portal's.

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

`options?`

</td>
<td>

[`Options`](../type-aliases/Options.md)<[`GetNearbyAccessData`](../type-aliases/GetNearbyAccessData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetNearbyAccessResponses`](../type-aliases/GetNearbyAccessResponses.md), [`GetNearbyAccessErrors`](../type-aliases/GetNearbyAccessErrors.md), `ThrowOnError`>
