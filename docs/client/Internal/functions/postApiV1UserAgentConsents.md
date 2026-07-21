# postApiV1UserAgentConsents

> **postApiV1UserAgentConsents**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1UserAgentConsentsData`](../type-aliases/PostApiV1UserAgentConsentsData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1UserAgentConsentsResponses`](../type-aliases/PostApiV1UserAgentConsentsResponses.md), [`PostApiV1UserAgentConsentsErrors`](../type-aliases/PostApiV1UserAgentConsentsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1847](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1847)

Create per-platform agent consent

Grants the authenticated user's consent for an agent on a specific platform (e.g. "sms"). Idempotent — returns the existing consent if one is already active. Un-revokes any prior revoked grant for the same (user, agent, platform).

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1UserAgentConsentsData`](../type-aliases/PostApiV1UserAgentConsentsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1UserAgentConsentsResponses`](../type-aliases/PostApiV1UserAgentConsentsResponses.md), [`PostApiV1UserAgentConsentsErrors`](../type-aliases/PostApiV1UserAgentConsentsErrors.md), `ThrowOnError`>
