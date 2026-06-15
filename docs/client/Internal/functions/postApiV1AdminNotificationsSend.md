# postApiV1AdminNotificationsSend

> **postApiV1AdminNotificationsSend**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminNotificationsSendData`](../type-aliases/PostApiV1AdminNotificationsSendData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminNotificationsSendResponses`](../type-aliases/PostApiV1AdminNotificationsSendResponses.md), [`PostApiV1AdminNotificationsSendErrors`](../type-aliases/PostApiV1AdminNotificationsSendErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:246](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#246)

Send test push notification (admin)

Sends an Expo push to every device registered under the resolved account. Exactly one of account\_id or user\_address must be provided. Returns the per-device delivery breakdown including any rows pruned because Expo reported DeviceNotRegistered.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminNotificationsSendData`](../type-aliases/PostApiV1AdminNotificationsSendData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminNotificationsSendResponses`](../type-aliases/PostApiV1AdminNotificationsSendResponses.md), [`PostApiV1AdminNotificationsSendErrors`](../type-aliases/PostApiV1AdminNotificationsSendErrors.md), `ThrowOnError`>
