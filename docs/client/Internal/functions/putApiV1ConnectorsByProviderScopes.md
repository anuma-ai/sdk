# putApiV1ConnectorsByProviderScopes

> **putApiV1ConnectorsByProviderScopes**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PutApiV1ConnectorsByProviderScopesData`](../type-aliases/PutApiV1ConnectorsByProviderScopesData.md), `ThrowOnError`>): `RequestResult`<[`PutApiV1ConnectorsByProviderScopesResponses`](../type-aliases/PutApiV1ConnectorsByProviderScopesResponses.md), [`PutApiV1ConnectorsByProviderScopesErrors`](../type-aliases/PutApiV1ConnectorsByProviderScopesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:705](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#705)

Batch Allow/Disable connector capabilities

Upserts the user's per-capability Allow/Disable policy for one provider. Each access level is validated against the provider registry (400 unknown). On any disable, the (user, oauth\_app) mint cache is purged so the change takes effect immediately rather than after the cache TTL. Returns the updated capability states.

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

[`Options`](../type-aliases/Options.md)<[`PutApiV1ConnectorsByProviderScopesData`](../type-aliases/PutApiV1ConnectorsByProviderScopesData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PutApiV1ConnectorsByProviderScopesResponses`](../type-aliases/PutApiV1ConnectorsByProviderScopesResponses.md), [`PutApiV1ConnectorsByProviderScopesErrors`](../type-aliases/PutApiV1ConnectorsByProviderScopesErrors.md), `ThrowOnError`>
