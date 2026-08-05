# getConsolidationScanRawOp

> **getConsolidationScanRawOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)): `Promise`<[`ConsolidationScanRaw`](../interfaces/ConsolidationScanRaw.md)\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:2335](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2335)

Consolidation sweep candidate scan (Fix C). Selects the content-light columns
the background dedup sweep clusters over, via `unsafeFetchRaw` — NO Model per
row (dodges the never-evicted RecordCache / web Pile-2 OOM) and NO `content`
decrypt. Scopes to the ACTIVE, recall-reachable rows via `baseVaultConditions`
(excludes deleted / archived / quarantined / superseded / cross-user), so the
sweep only ever collapses duplicates that are actually live in recall.

Refuses to run on an unscoped multi-tenant context (see
assertVaultScopeForSweep).

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

`Promise`<[`ConsolidationScanRaw`](../interfaces/ConsolidationScanRaw.md)\[]>
