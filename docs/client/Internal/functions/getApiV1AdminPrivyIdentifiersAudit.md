# getApiV1AdminPrivyIdentifiersAudit

> **getApiV1AdminPrivyIdentifiersAudit**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`GetApiV1AdminPrivyIdentifiersAuditData`](../type-aliases/GetApiV1AdminPrivyIdentifiersAuditData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1AdminPrivyIdentifiersAuditResponses`](../type-aliases/GetApiV1AdminPrivyIdentifiersAuditResponses.md), [`GetApiV1AdminPrivyIdentifiersAuditErrors`](../type-aliases/GetApiV1AdminPrivyIdentifiersAuditErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:352](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#352)

Audit Privy wallet identifiers

Lists accounts whose stored wallet identifier differs from the embedded wallet the Privy admin API returns for the same user. Read-only — no changes are written.

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

[`Options`](../type-aliases/Options.md)<[`GetApiV1AdminPrivyIdentifiersAuditData`](../type-aliases/GetApiV1AdminPrivyIdentifiersAuditData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1AdminPrivyIdentifiersAuditResponses`](../type-aliases/GetApiV1AdminPrivyIdentifiersAuditResponses.md), [`GetApiV1AdminPrivyIdentifiersAuditErrors`](../type-aliases/GetApiV1AdminPrivyIdentifiersAuditErrors.md), `ThrowOnError`>
