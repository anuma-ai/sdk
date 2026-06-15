# createServerToolsFilter

> **createServerToolsFilter**(`options`: [`CreateServerToolsFilterOptions`](../interfaces/CreateServerToolsFilterOptions.md)): (`embeddings`: `number`\[] | `number`\[]\[], `tools`: [`ServerTool`](../interfaces/ServerTool.md)\[]) => `string`\[]

Defined in: [src/lib/tools/serverTools.ts:1170](https://github.com/anuma-ai/sdk/blob/main/src/lib/tools/serverTools.ts#1170)

Build a server-tools filter function for use with `useChatStorage`'s
`serverTools` option. Composes `findMatchingTools`, `expandToolSetsAdditive`,
and an exclude-list into a single (embeddings, tools) → string\[] callback.

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

[`CreateServerToolsFilterOptions`](../interfaces/CreateServerToolsFilterOptions.md)

</td>
</tr>
</tbody>
</table>

## Returns

> (`embeddings`: `number`\[] | `number`\[]\[], `tools`: [`ServerTool`](../interfaces/ServerTool.md)\[]): `string`\[]

### Parameters

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

`embeddings`

</td>
<td>

`number`\[] | `number`\[]\[]

</td>
</tr>
<tr>
<td>

`tools`

</td>
<td>

[`ServerTool`](../interfaces/ServerTool.md)\[]

</td>
</tr>
</tbody>
</table>

### Returns

`string`\[]

## Example

```ts
import { createServerToolsFilter } from "@anuma/sdk/tools";

const serverTools = createServerToolsFilter({
  toolSets: [
    {
      name: "fal",
      members: ["AnumaFalMCP-fal_run", "AnumaFalMCP-fal_queue_submit", ...],
      anchors: ["AnumaFalMCP-fal_run", "AnumaFalMCP-fal_queue_submit", ...],
      anchorMinSimilarity: 0.7,
    },
  ],
  excludeTools: ["AnumaFalMCP-fal_billing"],
  matchOptions: { limit: 5, minSimilarity: 0.5 },
});
```
