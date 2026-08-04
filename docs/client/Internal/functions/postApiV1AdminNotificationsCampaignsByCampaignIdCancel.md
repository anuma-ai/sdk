# postApiV1AdminNotificationsCampaignsByCampaignIdCancel

> **postApiV1AdminNotificationsCampaignsByCampaignIdCancel**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminNotificationsCampaignsByCampaignIdCancelData`](../type-aliases/PostApiV1AdminNotificationsCampaignsByCampaignIdCancelData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminNotificationsCampaignsByCampaignIdCancelResponses`](../type-aliases/PostApiV1AdminNotificationsCampaignsByCampaignIdCancelResponses.md), [`PostApiV1AdminNotificationsCampaignsByCampaignIdCancelErrors`](../type-aliases/PostApiV1AdminNotificationsCampaignsByCampaignIdCancelErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:295](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#295)

Cancel an announcement campaign (admin)

Stops a draft, scheduled, or running campaign. Already-delivered sends stand; the worker stops at its next claim. Action-style path (POST /cancel, not DELETE) so a stray request can't destroy delivery history.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminNotificationsCampaignsByCampaignIdCancelData`](../type-aliases/PostApiV1AdminNotificationsCampaignsByCampaignIdCancelData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminNotificationsCampaignsByCampaignIdCancelResponses`](../type-aliases/PostApiV1AdminNotificationsCampaignsByCampaignIdCancelResponses.md), [`PostApiV1AdminNotificationsCampaignsByCampaignIdCancelErrors`](../type-aliases/PostApiV1AdminNotificationsCampaignsByCampaignIdCancelErrors.md), `ThrowOnError`>
