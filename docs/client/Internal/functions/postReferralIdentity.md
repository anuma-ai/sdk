# postReferralIdentity

> **postReferralIdentity**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostReferralIdentityData`](../type-aliases/PostReferralIdentityData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`PostReferralIdentityResponses`](../type-aliases/PostReferralIdentityResponses.md), [`PostReferralIdentityErrors`](../type-aliases/PostReferralIdentityErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1871](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1871)

Mint the Prefinery widget identity proof

Returns the HMAC of the caller's OWN bound tester email. The identity secret never reaches the browser, and the email is never taken from the request.

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

[`Options`](../type-aliases/Options.md)<[`PostReferralIdentityData`](../type-aliases/PostReferralIdentityData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostReferralIdentityResponses`](../type-aliases/PostReferralIdentityResponses.md), [`PostReferralIdentityErrors`](../type-aliases/PostReferralIdentityErrors.md), `ThrowOnError`>
