# getApiV1AuthMfaStatus

> **getApiV1AuthMfaStatus**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1AuthMfaStatusData`](../type-aliases/GetApiV1AuthMfaStatusData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`GetApiV1AuthMfaStatusResponses`](../type-aliases/GetApiV1AuthMfaStatusResponses.md), [`GetApiV1AuthMfaStatusErrors`](../type-aliases/GetApiV1AuthMfaStatusErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:550](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#550)

MFA status

Returns whether MFA is enabled and which factors are enrolled.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1AuthMfaStatusData`](../type-aliases/GetApiV1AuthMfaStatusData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1AuthMfaStatusResponses`](../type-aliases/GetApiV1AuthMfaStatusResponses.md), [`GetApiV1AuthMfaStatusErrors`](../type-aliases/GetApiV1AuthMfaStatusErrors.md), `ThrowOnError`>
