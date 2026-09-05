# postInternalPrefineryClaimTokens

> **postInternalPrefineryClaimTokens**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostInternalPrefineryClaimTokensData`](../type-aliases/PostInternalPrefineryClaimTokensData.md), `ThrowOnError`>): `RequestResult`<[`PostInternalPrefineryClaimTokensResponses`](../type-aliases/PostInternalPrefineryClaimTokensResponses.md), [`PostInternalPrefineryClaimTokensErrors`](../type-aliases/PostInternalPrefineryClaimTokensErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1861](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1861)

Mint a waitlist claim token (internal)

Service-key protected. Returns a bare opaque token; callers build the user-facing claim URL from their own public-URL constants. The tester need not exist in the mirror yet.

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

[`Options`](../type-aliases/Options.md)<[`PostInternalPrefineryClaimTokensData`](../type-aliases/PostInternalPrefineryClaimTokensData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostInternalPrefineryClaimTokensResponses`](../type-aliases/PostInternalPrefineryClaimTokensResponses.md), [`PostInternalPrefineryClaimTokensErrors`](../type-aliases/PostInternalPrefineryClaimTokensErrors.md), `ThrowOnError`>
