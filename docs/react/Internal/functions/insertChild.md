# insertChild

> **insertChild**(`parent`: [`AnumaNode`](../interfaces/AnumaNode.md), `node`: [`AnumaNode`](../interfaces/AnumaNode.md), `afterId?`: `string`): `void`

Defined in: [src/tools/slides/jsx.ts:800](https://github.com/anuma-ai/sdk/blob/main/src/tools/slides/jsx.ts#800)

Insert `node` into `parent.children`. If `afterId` is provided, the new
node is inserted immediately after the matched sibling; otherwise it is
appended to the end.

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

`parent`

</td>
<td>

[`AnumaNode`](../interfaces/AnumaNode.md)

</td>
</tr>
<tr>
<td>

`node`

</td>
<td>

[`AnumaNode`](../interfaces/AnumaNode.md)

</td>
</tr>
<tr>
<td>

`afterId?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

## Returns

`void`
