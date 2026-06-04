# postApiV1AdminPrivyIdentifiersMigrate

> **postApiV1AdminPrivyIdentifiersMigrate**<`ThrowOnError`>(`options`: [`Options`](../type-aliases/Options.md)<[`PostApiV1AdminPrivyIdentifiersMigrateData`](../type-aliases/PostApiV1AdminPrivyIdentifiersMigrateData.md), `ThrowOnError`>): `RequestResult`<[`PostApiV1AdminPrivyIdentifiersMigrateResponses`](../type-aliases/PostApiV1AdminPrivyIdentifiersMigrateResponses.md), [`PostApiV1AdminPrivyIdentifiersMigrateErrors`](../type-aliases/PostApiV1AdminPrivyIdentifiersMigrateErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:396](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#396)

Migrate Privy wallet identifiers

Rewrites each account's stored wallet identifier to the embedded wallet returned by the Privy admin API. Idempotent — accounts already pointing at the embedded wallet are skipped.

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

[`Options`](../type-aliases/Options.md)<[`PostApiV1AdminPrivyIdentifiersMigrateData`](../type-aliases/PostApiV1AdminPrivyIdentifiersMigrateData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`PostApiV1AdminPrivyIdentifiersMigrateResponses`](../type-aliases/PostApiV1AdminPrivyIdentifiersMigrateResponses.md), [`PostApiV1AdminPrivyIdentifiersMigrateErrors`](../type-aliases/PostApiV1AdminPrivyIdentifiersMigrateErrors.md), `ThrowOnError`>
