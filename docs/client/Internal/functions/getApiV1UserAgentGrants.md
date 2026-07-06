# getApiV1UserAgentGrants

> **getApiV1UserAgentGrants**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1UserAgentGrantsData`](../type-aliases/GetApiV1UserAgentGrantsData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1UserAgentGrantsResponses`](../type-aliases/GetApiV1UserAgentGrantsResponses.md), [`GetApiV1UserAgentGrantsErrors`](../type-aliases/GetApiV1UserAgentGrantsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1731](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1731)

Lookup active agent grant (service key)

Service-key-authenticated lookup of an active grant for (user\_id, agent\_id, platform). Returns 404 when no active grant exists. Used by the cf-tasks Worker to gate job execution.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1UserAgentGrantsData`](../type-aliases/GetApiV1UserAgentGrantsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1UserAgentGrantsResponses`](../type-aliases/GetApiV1UserAgentGrantsResponses.md), [`GetApiV1UserAgentGrantsErrors`](../type-aliases/GetApiV1UserAgentGrantsErrors.md), `ThrowOnError`>
