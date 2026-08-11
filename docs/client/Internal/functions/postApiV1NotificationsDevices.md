# postApiV1NotificationsDevices

> **postApiV1NotificationsDevices**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1NotificationsDevicesData`](../type-aliases/PostApiV1NotificationsDevicesData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1NotificationsDevicesResponses`](../type-aliases/PostApiV1NotificationsDevicesResponses.md), [`PostApiV1NotificationsDevicesErrors`](../type-aliases/PostApiV1NotificationsDevicesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1112](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1112)

Register push-notification device

Stores an Expo push token so the portal can later deliver push notifications to this device. Idempotent — re-posting the same token refreshes the row and bumps its last-seen timestamp. A token previously registered by a different account is reassigned to the caller (an Expo token identifies a physical device). Accounts keep at most 10 devices; the least recently seen are evicted.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1NotificationsDevicesData`](../type-aliases/PostApiV1NotificationsDevicesData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1NotificationsDevicesResponses`](../type-aliases/PostApiV1NotificationsDevicesResponses.md), [`PostApiV1NotificationsDevicesErrors`](../type-aliases/PostApiV1NotificationsDevicesErrors.md), `ThrowOnError`>
