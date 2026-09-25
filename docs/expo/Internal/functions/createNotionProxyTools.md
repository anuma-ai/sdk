# createNotionProxyTools

> **createNotionProxyTools**(`callMcp`: [`NotionMcpCaller`](../type-aliases/NotionMcpCaller.md)): `ToolConfig`\[]

Defined in: [src/tools/notion.ts:1137](https://github.com/anuma-ai/sdk/blob/main/src/tools/notion.ts#1137)

Create all Notion MCP tools, routed through the portal.

Same tools as [createNotionTools](createNotionTools.md), but no request reaches
mcp.notion.com from this runtime: Notion's MCP server rejects browser
origins, so the portal runs the call server-side. When the portal reports
the connector is not connected (401, 403, 412), the tool returns the
canonical `__anuma_connector_error_v1` result. Executors never throw.

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

`callMcp`

</td>
<td>

[`NotionMcpCaller`](../type-aliases/NotionMcpCaller.md)

</td>
<td>

POSTs `{ tool, arguments }` to the portal's
`/api/v1/connectors/notion/mcp` endpoint and resolves to `{ status, json }`.

</td>
</tr>
</tbody>
</table>

## Returns

`ToolConfig`\[]
