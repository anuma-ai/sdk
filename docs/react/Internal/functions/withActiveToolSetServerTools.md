# withActiveToolSetServerTools

> **withActiveToolSetServerTools**(`selected`: [`ServerTool`](../interfaces/ServerTool.md)\[], `allServerTools`: [`ServerTool`](../interfaces/ServerTool.md)\[], `serverToolsFilter`: [`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md), `activeToolSets`: readonly `string`\[], `extraToolSets`: readonly [`ToolSet`](../interfaces/ToolSet.md)\[]): [`ServerTool`](../interfaces/ServerTool.md)\[]

Defined in: [src/lib/tools/serverTools.ts:1305](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1305)

Add the server-tool members of every set named in `activeToolSets` to a
semantic server-tool selection.

A semantic filter ranks only the latest prompt, so a terse follow-up inside a
flow ("okay", "retry") drops the flow's server tools. This is the server-side
half of what `autoFilterClientTools` does for client tools: an active set's
members that are in the catalog are kept whatever the prompt scored, even
below the short-prompt gate, where `selected` is empty. Exclusions tagged on
the filter still win.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Default value</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`selected`

</td>
<td>

[`ServerTool`](../interfaces/ServerTool.md)\[]

</td>
<td>

`undefined`

</td>
<td>

What the semantic filter picked (`[]` when it did not run).

</td>
</tr>
<tr>
<td>

`allServerTools`

</td>
<td>

[`ServerTool`](../interfaces/ServerTool.md)\[]

</td>
<td>

`undefined`

</td>
<td>

The full server-tool catalog.

</td>
</tr>
<tr>
<td>

`serverToolsFilter`

</td>
<td>

[`ServerToolsFilterFunction`](../type-aliases/ServerToolsFilterFunction.md)

</td>
<td>

`undefined`

</td>
<td>

The filter function, read only for its `excludeTools` tag.

</td>
</tr>
<tr>
<td>

`activeToolSets`

</td>
<td>

readonly `string`\[]

</td>
<td>

`[]`

</td>
<td>

Set names that are sticky for this conversation.

</td>
</tr>
<tr>
<td>

`extraToolSets`

</td>
<td>

readonly [`ToolSet`](../interfaces/ToolSet.md)\[]

</td>
<td>

`[]`

</td>
<td>

The caller's sets beyond [BUILT\_IN\_TOOL\_SETS](../variables/BUILT_IN_TOOL_SETS.md).

</td>
</tr>
</tbody>
</table>

## Returns

[`ServerTool`](../interfaces/ServerTool.md)\[]

`selected`, followed by any active-set members it was missing.
