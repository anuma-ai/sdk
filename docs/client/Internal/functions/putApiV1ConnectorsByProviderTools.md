# putApiV1ConnectorsByProviderTools

> **putApiV1ConnectorsByProviderTools**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PutApiV1ConnectorsByProviderToolsData`](../type-aliases/PutApiV1ConnectorsByProviderToolsData.md), `ThrowOnError`>): `RequestResult`<[`PutApiV1ConnectorsByProviderToolsResponses`](../type-aliases/PutApiV1ConnectorsByProviderToolsResponses.md), [`PutApiV1ConnectorsByProviderToolsErrors`](../type-aliases/PutApiV1ConnectorsByProviderToolsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:990](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#990)

Batch ALLOW/DENY connector tools

Upserts the user's per-tool ALLOW/DENY policy for one provider. The provider is validated against the registry (400 unknown); tool names are opaque (not parsed) but must be 1-255 chars, and the batch is capped at 100 items. Returns the post-write denied set.

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

[`Options`](../type-aliases/Options.md)<[`PutApiV1ConnectorsByProviderToolsData`](../type-aliases/PutApiV1ConnectorsByProviderToolsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PutApiV1ConnectorsByProviderToolsResponses`](../type-aliases/PutApiV1ConnectorsByProviderToolsResponses.md), [`PutApiV1ConnectorsByProviderToolsErrors`](../type-aliases/PutApiV1ConnectorsByProviderToolsErrors.md), `ThrowOnError`>
