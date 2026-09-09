# getApiV1AdminPhoneHashesAudit

> **getApiV1AdminPhoneHashesAudit**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1AdminPhoneHashesAuditData`](../type-aliases/GetApiV1AdminPhoneHashesAuditData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1AdminPhoneHashesAuditResponses`](../type-aliases/GetApiV1AdminPhoneHashesAuditResponses.md), [`GetApiV1AdminPhoneHashesAuditErrors`](../type-aliases/GetApiV1AdminPhoneHashesAuditErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:478](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#478)

Audit phone-hash coverage

Reports how many wallet accounts with a Privy DID already have phone\_hash set vs have a Privy-linked phone that still needs hashing. Read-only.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1AdminPhoneHashesAuditData`](../type-aliases/GetApiV1AdminPhoneHashesAuditData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1AdminPhoneHashesAuditResponses`](../type-aliases/GetApiV1AdminPhoneHashesAuditResponses.md), [`GetApiV1AdminPhoneHashesAuditErrors`](../type-aliases/GetApiV1AdminPhoneHashesAuditErrors.md), `ThrowOnError`>
