# postReferralInvite

> **postReferralInvite**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostReferralInviteData`](../type-aliases/PostReferralInviteData.md), `ThrowOnError`>): `RequestResult`<[`PostReferralInviteResponses`](../type-aliases/PostReferralInviteResponses.md), [`PostReferralInviteErrors`](../type-aliases/PostReferralInviteErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1857](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1857)

Send a Prefinery friend invitation

Proxies a friend invitation from the caller's bound tester. Prefinery sends the email from our template and owns the per-tester budget; the portal adds a per-account daily cap.

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

[`Options`](../type-aliases/Options.md)<[`PostReferralInviteData`](../type-aliases/PostReferralInviteData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostReferralInviteResponses`](../type-aliases/PostReferralInviteResponses.md), [`PostReferralInviteErrors`](../type-aliases/PostReferralInviteErrors.md), `ThrowOnError`>
