# postApiV1AdminNotificationsCampaigns

> **postApiV1AdminNotificationsCampaigns**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminNotificationsCampaignsData`](../type-aliases/PostApiV1AdminNotificationsCampaignsData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminNotificationsCampaignsResponses`](../type-aliases/PostApiV1AdminNotificationsCampaignsResponses.md), [`PostApiV1AdminNotificationsCampaignsErrors`](../type-aliases/PostApiV1AdminNotificationsCampaignsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:297](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#297)

Create an announcement campaign (admin)

Creates a push announcement campaign. Status "draft" (default) is inert; "scheduled" requires scheduled\_at and is drained by the campaign worker once due. Delivery enforces the per-recipient announcements opt-in regardless of segment.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminNotificationsCampaignsData`](../type-aliases/PostApiV1AdminNotificationsCampaignsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminNotificationsCampaignsResponses`](../type-aliases/PostApiV1AdminNotificationsCampaignsResponses.md), [`PostApiV1AdminNotificationsCampaignsErrors`](../type-aliases/PostApiV1AdminNotificationsCampaignsErrors.md), `ThrowOnError`>
