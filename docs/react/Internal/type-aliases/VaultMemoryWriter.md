# VaultMemoryWriter

> **VaultMemoryWriter** = (`input`: [`VaultWriteInput`](../interfaces/VaultWriteInput.md)) => `Promise`<[`VaultWriteOutcome`](../interfaces/VaultWriteOutcome.md)>

Defined in: [src/lib/memoryVault/tool.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/lib/memoryVault/tool.ts#72)

The seam through which the tool writes NEW memories when the host supplies one.
`useChatStorage` (react + expo) passes a `retain()`-backed writer so a
model-initiated save gets the same cosine auto-merge the background extractor
gets, instead of a bare insert that trusts the model to have de-duplicated.

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

`input`

</td>
<td>

[`VaultWriteInput`](../interfaces/VaultWriteInput.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<[`VaultWriteOutcome`](../interfaces/VaultWriteOutcome.md)>
