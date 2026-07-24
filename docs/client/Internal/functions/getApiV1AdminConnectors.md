# getApiV1AdminConnectors

> **getApiV1AdminConnectors**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1AdminConnectorsData`](../type-aliases/GetApiV1AdminConnectorsData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1AdminConnectorsResponses`](../type-aliases/GetApiV1AdminConnectorsResponses.md), [`GetApiV1AdminConnectorsErrors`](../type-aliases/GetApiV1AdminConnectorsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:222](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#222)

List connector enable/disable state (admin)

Returns the kill-switch state for every logical connector. Connectors with no stored setting default to enabled. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1AdminConnectorsData`](../type-aliases/GetApiV1AdminConnectorsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1AdminConnectorsResponses`](../type-aliases/GetApiV1AdminConnectorsResponses.md), [`GetApiV1AdminConnectorsErrors`](../type-aliases/GetApiV1AdminConnectorsErrors.md), `ThrowOnError`>
