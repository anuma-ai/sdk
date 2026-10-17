# MemoryDecay

Defined in: [src/lib/memory/store/types.ts:172](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#172)

Rule-based memory decay over a store's metadata, on any backend.

## Methods

### createDecaySweeper()

> **createDecaySweeper**(`options?`: [`MemoryDecaySweeperOptions`](../type-aliases/MemoryDecaySweeperOptions.md)): [`DecaySweeper`](DecaySweeper.md)

Defined in: [src/lib/memory/store/types.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/store/types.ts#174)

A rule-based decay sweeper over this store's memories.

**Parameters**

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

`options?`

</td>
<td>

[`MemoryDecaySweeperOptions`](../type-aliases/MemoryDecaySweeperOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

[`DecaySweeper`](DecaySweeper.md)
