# postApiV1CreditsClaimTask

> **postApiV1CreditsClaimTask**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1CreditsClaimTaskData`](../type-aliases/PostApiV1CreditsClaimTaskData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1CreditsClaimTaskResponses`](../type-aliases/PostApiV1CreditsClaimTaskResponses.md), [`PostApiV1CreditsClaimTaskErrors`](../type-aliases/PostApiV1CreditsClaimTaskErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:262](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#262)

Claim task reward

Claims a one-time task reward (e.g., import memories from a chat provider). Each task can only be claimed once per account. The request must include the extracted memories as proof of import completion.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1CreditsClaimTaskData`](../type-aliases/PostApiV1CreditsClaimTaskData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1CreditsClaimTaskResponses`](../type-aliases/PostApiV1CreditsClaimTaskResponses.md), [`PostApiV1CreditsClaimTaskErrors`](../type-aliases/PostApiV1CreditsClaimTaskErrors.md), `ThrowOnError`>
