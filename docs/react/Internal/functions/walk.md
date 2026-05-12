# walk

> **walk**(`root`: [`AnumaNode`](../interfaces/AnumaNode.md), `visitor`: (`node`: [`AnumaNode`](../interfaces/AnumaNode.md), `parent`: [`AnumaNode`](../interfaces/AnumaNode.md) | `null`) => `false` | `void`): `void`

Defined in: [src/tools/slides/jsx.ts:729](https://github.com/anuma-ai/sdk/blob/main/src/tools/slides/jsx.ts#729)

Walk the tree depth-first. Visitor sees `(node, parent)` — parent is
`null` for the root. Return `false` from the visitor to skip descending
into a node's children.

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

`root`

</td>
<td>

[`AnumaNode`](../interfaces/AnumaNode.md)

</td>
</tr>
<tr>
<td>

`visitor`

</td>
<td>

(`node`: [`AnumaNode`](../interfaces/AnumaNode.md), `parent`: [`AnumaNode`](../interfaces/AnumaNode.md) | `null`) => `false` | `void`

</td>
</tr>
</tbody>
</table>

## Returns

`void`
