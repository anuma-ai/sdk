# deleteApiV1UserAgentConsentsByAgentId

> **deleteApiV1UserAgentConsentsByAgentId**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`DeleteApiV1UserAgentConsentsByAgentIdData`](../type-aliases/DeleteApiV1UserAgentConsentsByAgentIdData.md), `ThrowOnError`>): `RequestResult`<[`DeleteApiV1UserAgentConsentsByAgentIdResponses`](../type-aliases/DeleteApiV1UserAgentConsentsByAgentIdResponses.md), [`DeleteApiV1UserAgentConsentsByAgentIdErrors`](../type-aliases/DeleteApiV1UserAgentConsentsByAgentIdErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1785](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1785)

Revoke per-platform agent consent

Revokes the authenticated user's consent for an agent on a specific platform. Idempotent — returns 200 even when no active consent exists. Other platforms' consents are unaffected.

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

[`Options`](../type-aliases/Options.md)<[`DeleteApiV1UserAgentConsentsByAgentIdData`](../type-aliases/DeleteApiV1UserAgentConsentsByAgentIdData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`DeleteApiV1UserAgentConsentsByAgentIdResponses`](../type-aliases/DeleteApiV1UserAgentConsentsByAgentIdResponses.md), [`DeleteApiV1UserAgentConsentsByAgentIdErrors`](../type-aliases/DeleteApiV1UserAgentConsentsByAgentIdErrors.md), `ThrowOnError`>
