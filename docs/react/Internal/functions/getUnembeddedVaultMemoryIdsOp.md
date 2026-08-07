# getUnembeddedVaultMemoryIdsOp

> **getUnembeddedVaultMemoryIdsOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)): `Promise`<`string`\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:2360](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2360)

Ids of ACTIVE vault rows that have NO embedding yet — the backfill targets for
the consolidation sweep (a row without a vector can't be clustered). Same
content-light `unsafeFetchRaw` + `baseVaultConditions` scoping as
[getConsolidationScanRawOp](getConsolidationScanRawOp.md); the sweep decrypts + embeds them in a
bounded batch. Refuses to run on an unscoped context.

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

`ctx`

</td>
<td>

[`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`string`\[]>
