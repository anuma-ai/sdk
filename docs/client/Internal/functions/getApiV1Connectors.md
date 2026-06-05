# getApiV1Connectors

> **getApiV1Connectors**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1ConnectorsData`](../type-aliases/GetApiV1ConnectorsData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1ConnectorsResponses`](../type-aliases/GetApiV1ConnectorsResponses.md), [`GetApiV1ConnectorsErrors`](../type-aliases/GetApiV1ConnectorsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:780](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#780)

List the user's connected connectors

Returns the set of active connector credentials owned by the authenticated user. The encrypted\_refresh\_token is never exposed; the response is safe to ship to the browser.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1ConnectorsData`](../type-aliases/GetApiV1ConnectorsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1ConnectorsResponses`](../type-aliases/GetApiV1ConnectorsResponses.md), [`GetApiV1ConnectorsErrors`](../type-aliases/GetApiV1ConnectorsErrors.md), `ThrowOnError`>
