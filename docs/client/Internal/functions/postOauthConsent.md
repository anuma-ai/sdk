# postOauthConsent

> **postOauthConsent**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`PostOauthConsentData`](../type-aliases/PostOauthConsentData.md), `ThrowOnError`, `unknown`>): `RequestResult`<[`PostOauthConsentResponses`](../type-aliases/PostOauthConsentResponses.md), [`PostOauthConsentErrors`](../type-aliases/PostOauthConsentErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1627](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1627)

Process OAuth consent

Handles the consent form submission. Approve creates a grant and returns the auth code as JSON when the caller sends `Accept: application/json`, or as a 302 redirect to redirect\_uri otherwise. Deny mirrors the same content negotiation: JSON error body or redirect with `error=access_denied`.

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

[`Options`](../type-aliases/Options.md)<[`PostOauthConsentData`](../type-aliases/PostOauthConsentData.md), `ThrowOnError`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostOauthConsentResponses`](../type-aliases/PostOauthConsentResponses.md), [`PostOauthConsentErrors`](../type-aliases/PostOauthConsentErrors.md), `ThrowOnError`>
