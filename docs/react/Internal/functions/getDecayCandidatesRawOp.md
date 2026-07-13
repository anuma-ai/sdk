# getDecayCandidatesRawOp

> **getDecayCandidatesRawOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md)): `Promise`<[`DecayCandidateRaw`](../interfaces/DecayCandidateRaw.md)\[]>

Defined in: [src/lib/db/memoryVault/operations.ts:800](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#800)

Decay sweep candidate scan (PR2). Selects the plaintext columns
`classifyDecay` (in `memory/decay`) needs via
`unsafeFetchRaw` — NO Model per row (dodges the never-evicted RecordCache /
web Pile-2 OOM history) and NO `content` read / decrypt (zero-knowledge).

Includes archived AND quarantined rows (so archived→delete transitions and
aged quarantined rows are seen) but excludes hard-deleted rows — the
`baseVaultConditions` default keeps `is_deleted = false`.

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

`Promise`<[`DecayCandidateRaw`](../interfaces/DecayCandidateRaw.md)\[]>
