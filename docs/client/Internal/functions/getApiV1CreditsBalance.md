# getApiV1CreditsBalance

> **getApiV1CreditsBalance**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1CreditsBalanceData`](../type-aliases/GetApiV1CreditsBalanceData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1CreditsBalanceResponses`](../type-aliases/GetApiV1CreditsBalanceResponses.md), [`GetApiV1CreditsBalanceErrors`](../type-aliases/GetApiV1CreditsBalanceErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:414](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#414)

Get credit balance

Returns the credit balance and related information for the authenticated user. Optionally accepts X-Timezone header for accurate next claim time calculation.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1CreditsBalanceData`](../type-aliases/GetApiV1CreditsBalanceData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1CreditsBalanceResponses`](../type-aliases/GetApiV1CreditsBalanceResponses.md), [`GetApiV1CreditsBalanceErrors`](../type-aliases/GetApiV1CreditsBalanceErrors.md), `ThrowOnError`>
