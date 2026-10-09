# createLocalMemoryStore

> **createLocalMemoryStore**(`options`: [`LocalMemoryStoreOptions`](../interfaces/LocalMemoryStoreOptions.md)): [`MemoryStore`](../interfaces/MemoryStore.md)

Defined in: [src/lib/memory/store/local.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/local.ts#88)

[MemoryStore](../interfaces/MemoryStore.md) over the on-device WatermelonDB vault. Builds the vault +
entity contexts once and delegates every method to the existing ops, so
behavior is exactly theirs.

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

[`LocalMemoryStoreOptions`](../interfaces/LocalMemoryStoreOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`MemoryStore`](../interfaces/MemoryStore.md)
