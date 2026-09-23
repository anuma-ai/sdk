# updateVaultMemoryEmbeddingOp

> **updateVaultMemoryEmbeddingOp**(`ctx`: [`VaultMemoryOperationsContext`](../interfaces/VaultMemoryOperationsContext.md), `id`: `string`, `embedding`: `string`, `embeddingModel`: `string`, `expected?`: [`VaultEmbeddingExpectation`](../interfaces/VaultEmbeddingExpectation.md)): `Promise`<`boolean`>

Defined in: [src/lib/db/memoryVault/operations.ts:2348](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/operations.ts#2348)

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
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
<td>

‐

</td>
</tr>
<tr>
<td>

`id`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`embedding`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`embeddingModel`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`expected?`

</td>
<td>

[`VaultEmbeddingExpectation`](../interfaces/VaultEmbeddingExpectation.md)

</td>
<td>

When given, the write lands only if the row still matches it.

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<`boolean`>
