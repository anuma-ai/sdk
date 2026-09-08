# parseMedia

> **parseMedia**(`value`: `unknown`): [`PhotoMediaRef`](../interfaces/PhotoMediaRef.md)\[] | `null`

Defined in: [src/lib/db/memoryVault/types.ts:163](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/memoryVault/types.ts#163)

Decode the stored `media` column. Returns null for "no photo behind this
memory" (the column is null on every non-photo row) and tolerates a corrupt
or unexpected payload by reading it as null too — a memory whose photo
reference cannot be parsed is still a perfectly good memory, and losing the
thumbnail is a better failure than losing the row.

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

`value`

</td>
<td>

`unknown`

</td>
</tr>
</tbody>
</table>

## Returns

[`PhotoMediaRef`](../interfaces/PhotoMediaRef.md)\[] | `null`
