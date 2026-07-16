# postApiV1AdminNotificationsAnnounceModel

> **postApiV1AdminNotificationsAnnounceModel**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminNotificationsAnnounceModelData`](../type-aliases/PostApiV1AdminNotificationsAnnounceModelData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminNotificationsAnnounceModelResponses`](../type-aliases/PostApiV1AdminNotificationsAnnounceModelResponses.md), [`PostApiV1AdminNotificationsAnnounceModelErrors`](../type-aliases/PostApiV1AdminNotificationsAnnounceModelErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:326](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#326)

Announce a new model via push notification (admin)

Broadcasts an Expo push to every registered device announcing a curated model. Title and body default from the catalog entry; the tap deep-links to the in-app models screen. Idempotent per model\_id — repeat calls return 409 unless force=true is set, which also re-announces after a partial delivery.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminNotificationsAnnounceModelData`](../type-aliases/PostApiV1AdminNotificationsAnnounceModelData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminNotificationsAnnounceModelResponses`](../type-aliases/PostApiV1AdminNotificationsAnnounceModelResponses.md), [`PostApiV1AdminNotificationsAnnounceModelErrors`](../type-aliases/PostApiV1AdminNotificationsAnnounceModelErrors.md), `ThrowOnError`>
