# getApiV1NotificationsPreferences

> **getApiV1NotificationsPreferences**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1NotificationsPreferencesData`](../type-aliases/GetApiV1NotificationsPreferencesData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`GetApiV1NotificationsPreferencesResponses`](../type-aliases/GetApiV1NotificationsPreferencesResponses.md), [`GetApiV1NotificationsPreferencesErrors`](../type-aliases/GetApiV1NotificationsPreferencesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1147](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1147)

List notification preferences

Returns every notification category (server-driven list) with the authenticated user's effective opt-in state. Categories the user never toggled report their server default; the `announcements` category defaults to off (marketing pushes are strictly opt-in).

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

`options?`

</td>
<td>

[`Options`](../type-aliases/Options.md)<[`GetApiV1NotificationsPreferencesData`](../type-aliases/GetApiV1NotificationsPreferencesData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1NotificationsPreferencesResponses`](../type-aliases/GetApiV1NotificationsPreferencesResponses.md), [`GetApiV1NotificationsPreferencesErrors`](../type-aliases/GetApiV1NotificationsPreferencesErrors.md), `ThrowOnError`>
