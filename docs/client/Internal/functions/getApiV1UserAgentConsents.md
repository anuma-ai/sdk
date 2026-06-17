# getApiV1UserAgentConsents

> **getApiV1UserAgentConsents**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1UserAgentConsentsData`](../type-aliases/GetApiV1UserAgentConsentsData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1UserAgentConsentsResponses`](../type-aliases/GetApiV1UserAgentConsentsResponses.md), [`GetApiV1UserAgentConsentsErrors`](../type-aliases/GetApiV1UserAgentConsentsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1629](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1629)

List active per-platform agent consents

Returns the authenticated user's active consents, optionally filtered by platform.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1UserAgentConsentsData`](../type-aliases/GetApiV1UserAgentConsentsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1UserAgentConsentsResponses`](../type-aliases/GetApiV1UserAgentConsentsResponses.md), [`GetApiV1UserAgentConsentsErrors`](../type-aliases/GetApiV1UserAgentConsentsErrors.md), `ThrowOnError`>
