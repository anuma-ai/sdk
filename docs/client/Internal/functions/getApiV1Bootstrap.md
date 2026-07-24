# getApiV1Bootstrap

> **getApiV1Bootstrap**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1BootstrapData`](../type-aliases/GetApiV1BootstrapData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`GetApiV1BootstrapResponses`](../type-aliases/GetApiV1BootstrapResponses.md), [`GetApiV1BootstrapErrors`](../type-aliases/GetApiV1BootstrapErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:586](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#586)

Bootstrap client session

Returns the authenticated user identity, feature-flag assignments, server build metadata, and the connector availability catalog in a single call. Intended to be called once after auth resolves on the client.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1BootstrapData`](../type-aliases/GetApiV1BootstrapData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1BootstrapResponses`](../type-aliases/GetApiV1BootstrapResponses.md), [`GetApiV1BootstrapErrors`](../type-aliases/GetApiV1BootstrapErrors.md), `ThrowOnError`>
