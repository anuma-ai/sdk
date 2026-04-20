# getApiV1AdminUsersLookup

> **getApiV1AdminUsersLookup**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1AdminUsersLookupData`](../type-aliases/GetApiV1AdminUsersLookupData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1AdminUsersLookupResponses`](../type-aliases/GetApiV1AdminUsersLookupResponses.md), [`GetApiV1AdminUsersLookupErrors`](../type-aliases/GetApiV1AdminUsersLookupErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:322](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#322)

Lookup user by identifier

Retrieves account details, all app enrollments with balances, and text registrations. Accepts wallet\_address, phone, telegram, or email (exactly one required).

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1AdminUsersLookupData`](../type-aliases/GetApiV1AdminUsersLookupData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1AdminUsersLookupResponses`](../type-aliases/GetApiV1AdminUsersLookupResponses.md), [`GetApiV1AdminUsersLookupErrors`](../type-aliases/GetApiV1AdminUsersLookupErrors.md), `ThrowOnError`>
