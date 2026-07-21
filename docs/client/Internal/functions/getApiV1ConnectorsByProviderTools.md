# getApiV1ConnectorsByProviderTools

> **getApiV1ConnectorsByProviderTools**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1ConnectorsByProviderToolsData`](../type-aliases/GetApiV1ConnectorsByProviderToolsData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1ConnectorsByProviderToolsResponses`](../type-aliases/GetApiV1ConnectorsByProviderToolsResponses.md), [`GetApiV1ConnectorsByProviderToolsErrors`](../type-aliases/GetApiV1ConnectorsByProviderToolsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:978](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#978)

Denied tools for a connector

Returns the tools the user has explicitly denied for one provider. Tools absent from the list are enabled (default-open). The provider is validated against the registry (400 unknown); tool names are opaque and never validated.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1ConnectorsByProviderToolsData`](../type-aliases/GetApiV1ConnectorsByProviderToolsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1ConnectorsByProviderToolsResponses`](../type-aliases/GetApiV1ConnectorsByProviderToolsResponses.md), [`GetApiV1ConnectorsByProviderToolsErrors`](../type-aliases/GetApiV1ConnectorsByProviderToolsErrors.md), `ThrowOnError`>
