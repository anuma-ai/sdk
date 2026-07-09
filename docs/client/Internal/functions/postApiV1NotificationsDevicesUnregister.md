# postApiV1NotificationsDevicesUnregister

> **postApiV1NotificationsDevicesUnregister**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1NotificationsDevicesUnregisterData`](../type-aliases/PostApiV1NotificationsDevicesUnregisterData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1NotificationsDevicesUnregisterResponses`](../type-aliases/PostApiV1NotificationsDevicesUnregisterResponses.md), [`PostApiV1NotificationsDevicesUnregisterErrors`](../type-aliases/PostApiV1NotificationsDevicesUnregisterErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1362](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1362)

Unregister push-notification device

Removes a previously registered Expo push token for the authenticated user. Returns 200 on success and 404 if no matching device exists.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1NotificationsDevicesUnregisterData`](../type-aliases/PostApiV1NotificationsDevicesUnregisterData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1NotificationsDevicesUnregisterResponses`](../type-aliases/PostApiV1NotificationsDevicesUnregisterResponses.md), [`PostApiV1NotificationsDevicesUnregisterErrors`](../type-aliases/PostApiV1NotificationsDevicesUnregisterErrors.md), `ThrowOnError`>
