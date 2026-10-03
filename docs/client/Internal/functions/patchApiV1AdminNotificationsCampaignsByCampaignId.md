# patchApiV1AdminNotificationsCampaignsByCampaignId

> **patchApiV1AdminNotificationsCampaignsByCampaignId**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PatchApiV1AdminNotificationsCampaignsByCampaignIdData`](../type-aliases/PatchApiV1AdminNotificationsCampaignsByCampaignIdData.md), `ThrowOnError`>): `RequestResult`<[`PatchApiV1AdminNotificationsCampaignsByCampaignIdResponses`](../type-aliases/PatchApiV1AdminNotificationsCampaignsByCampaignIdResponses.md), [`PatchApiV1AdminNotificationsCampaignsByCampaignIdErrors`](../type-aliases/PatchApiV1AdminNotificationsCampaignsByCampaignIdErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:365](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#365)

Edit a draft/scheduled announcement campaign (admin)

Patch semantics: absent fields stay untouched; an empty segment list clears that filter. Only draft and scheduled campaigns are editable — a running campaign's definition is already partially delivered.

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

[`Options`](../type-aliases/Options.md)<[`PatchApiV1AdminNotificationsCampaignsByCampaignIdData`](../type-aliases/PatchApiV1AdminNotificationsCampaignsByCampaignIdData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PatchApiV1AdminNotificationsCampaignsByCampaignIdResponses`](../type-aliases/PatchApiV1AdminNotificationsCampaignsByCampaignIdResponses.md), [`PatchApiV1AdminNotificationsCampaignsByCampaignIdErrors`](../type-aliases/PatchApiV1AdminNotificationsCampaignsByCampaignIdErrors.md), `ThrowOnError`>
