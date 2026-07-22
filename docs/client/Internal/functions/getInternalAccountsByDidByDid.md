# getInternalAccountsByDidByDid

> **getInternalAccountsByDidByDid**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetInternalAccountsByDidByDidData`](../type-aliases/GetInternalAccountsByDidByDidData.md), `ThrowOnError`>): `RequestResult`<[`GetInternalAccountsByDidByDidResponses`](../type-aliases/GetInternalAccountsByDidByDidResponses.md), [`GetInternalAccountsByDidByDidErrors`](../type-aliases/GetInternalAccountsByDidByDidErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:1564](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#1564)

Resolve a Privy DID to an account ID

Internal server-to-server endpoint used by the nearby service. Returns the internal account ID for the given Privy DID.

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

[`Options`](../type-aliases/Options.md)<[`GetInternalAccountsByDidByDidData`](../type-aliases/GetInternalAccountsByDidByDidData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetInternalAccountsByDidByDidResponses`](../type-aliases/GetInternalAccountsByDidByDidResponses.md), [`GetInternalAccountsByDidByDidErrors`](../type-aliases/GetInternalAccountsByDidByDidErrors.md), `ThrowOnError`>
