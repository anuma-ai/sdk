# putApiV1NotificationsPreferences

> **putApiV1NotificationsPreferences**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PutApiV1NotificationsPreferencesData`](../type-aliases/PutApiV1NotificationsPreferencesData.md), `ThrowOnError`>): `RequestResult`<[`PutApiV1NotificationsPreferencesResponses`](../type-aliases/PutApiV1NotificationsPreferencesResponses.md), [`PutApiV1NotificationsPreferencesErrors`](../type-aliases/PutApiV1NotificationsPreferencesErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1074](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1074)

Set notification preferences

Records explicit per-category opt-in/out choices for the authenticated user. Unknown category ids are rejected. Returns the full resolved category list.

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

[`Options`](../type-aliases/Options.md)<[`PutApiV1NotificationsPreferencesData`](../type-aliases/PutApiV1NotificationsPreferencesData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PutApiV1NotificationsPreferencesResponses`](../type-aliases/PutApiV1NotificationsPreferencesResponses.md), [`PutApiV1NotificationsPreferencesErrors`](../type-aliases/PutApiV1NotificationsPreferencesErrors.md), `ThrowOnError`>
