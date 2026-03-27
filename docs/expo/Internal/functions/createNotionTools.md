# createNotionTools

> **createNotionTools**(`getAccessToken`: () => `string` | `null`, `requestNotionAccess`: () => `Promise`<`string`>): `ToolConfig`\[]

Defined in: [src/tools/notion.ts:1065](https://github.com/anuma-ai/sdk/blob/main/src/tools/notion.ts#1065)

Create all Notion MCP tools

Returns tools that communicate with Notion's hosted MCP server.
The MCP server handles all Notion API interactions.

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

`getAccessToken`

</td>
<td>

() => `string` | `null`

</td>
</tr>
<tr>
<td>

`requestNotionAccess`

</td>
<td>

() => `Promise`<`string`>

</td>
</tr>
</tbody>
</table>

## Returns

`ToolConfig`\[]
