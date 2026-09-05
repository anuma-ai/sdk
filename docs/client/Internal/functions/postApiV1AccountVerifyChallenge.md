# postApiV1AccountVerifyChallenge

> **postApiV1AccountVerifyChallenge**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AccountVerifyChallengeData`](../type-aliases/PostApiV1AccountVerifyChallengeData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`PostApiV1AccountVerifyChallengeResponses`](../type-aliases/PostApiV1AccountVerifyChallengeResponses.md), [`PostApiV1AccountVerifyChallengeErrors`](../type-aliases/PostApiV1AccountVerifyChallengeErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#47)

Verify the signup challenge

Records that the authenticated account cleared the Cloudflare Turnstile signup challenge. Idempotent: an already-verified account returns 200. The Turnstile token is verified by middleware before this handler runs.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AccountVerifyChallengeData`](../type-aliases/PostApiV1AccountVerifyChallengeData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AccountVerifyChallengeResponses`](../type-aliases/PostApiV1AccountVerifyChallengeResponses.md), [`PostApiV1AccountVerifyChallengeErrors`](../type-aliases/PostApiV1AccountVerifyChallengeErrors.md), `ThrowOnError`>
