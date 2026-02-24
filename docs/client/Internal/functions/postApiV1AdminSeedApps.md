# postApiV1AdminSeedApps

> **postApiV1AdminSeedApps**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminSeedAppsData`](../type-aliases/PostApiV1AdminSeedAppsData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminSeedAppsResponses`](../type-aliases/PostApiV1AdminSeedAppsResponses.md), [`PostApiV1AdminSeedAppsErrors`](../type-aliases/PostApiV1AdminSeedAppsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:178](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/sdk.gen.ts#L178)

Seed apps and API keys

Seeds apps and their API keys into the database. Uses upsert - existing apps are updated. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminSeedAppsData`](../type-aliases/PostApiV1AdminSeedAppsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminSeedAppsResponses`](../type-aliases/PostApiV1AdminSeedAppsResponses.md), [`PostApiV1AdminSeedAppsErrors`](../type-aliases/PostApiV1AdminSeedAppsErrors.md), `ThrowOnError`>
