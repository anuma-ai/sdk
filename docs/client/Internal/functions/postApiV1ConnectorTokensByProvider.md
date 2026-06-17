# postApiV1ConnectorTokensByProvider

> **postApiV1ConnectorTokensByProvider**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1ConnectorTokensByProviderData`](../type-aliases/PostApiV1ConnectorTokensByProviderData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1ConnectorTokensByProviderResponses`](../type-aliases/PostApiV1ConnectorTokensByProviderResponses.md), [`PostApiV1ConnectorTokensByProviderErrors`](../type-aliases/PostApiV1ConnectorTokensByProviderErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:784](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#784)

Mint a short-lived upstream connector access token

Returns a short-lived upstream access token for the (user, agent, provider) tuple, after enforcing per-agent scope authorization. The caller uses the returned token directly against the upstream provider's API. Errors carry a structured envelope: 412 connector\_not\_connected/scope\_not\_covered include a connect\_url the caller can open to remediate.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1ConnectorTokensByProviderData`](../type-aliases/PostApiV1ConnectorTokensByProviderData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1ConnectorTokensByProviderResponses`](../type-aliases/PostApiV1ConnectorTokensByProviderResponses.md), [`PostApiV1ConnectorTokensByProviderErrors`](../type-aliases/PostApiV1ConnectorTokensByProviderErrors.md), `ThrowOnError`>
