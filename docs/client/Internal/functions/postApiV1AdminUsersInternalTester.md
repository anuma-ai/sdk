# postApiV1AdminUsersInternalTester

> **postApiV1AdminUsersInternalTester**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminUsersInternalTesterData`](../type-aliases/PostApiV1AdminUsersInternalTesterData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminUsersInternalTesterResponses`](../type-aliases/PostApiV1AdminUsersInternalTesterResponses.md), [`PostApiV1AdminUsersInternalTesterErrors`](../type-aliases/PostApiV1AdminUsersInternalTesterErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:483](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#483)

Grant or revoke the People Nearby internal-tester flag

Sets or clears the internal-tester flag on an account. An internal tester is exempt from the People Nearby onboarding geofence, so they can create a Nearby profile from outside the launch region — required for testers who are not in the launch market. `grant` is REQUIRED (true to grant, false to revoke); omitting it is a 400 rather than a silent revoke. Requires admin API key.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminUsersInternalTesterData`](../type-aliases/PostApiV1AdminUsersInternalTesterData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminUsersInternalTesterResponses`](../type-aliases/PostApiV1AdminUsersInternalTesterResponses.md), [`PostApiV1AdminUsersInternalTesterErrors`](../type-aliases/PostApiV1AdminUsersInternalTesterErrors.md), `ThrowOnError`>
