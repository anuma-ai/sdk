# NotionMcpCaller

> **NotionMcpCaller** = (`tool`: `string`, `args`: `Record`<`string`, `unknown`>) => `Promise`<{ `json`: `unknown`; `status`: `number`; }>

Defined in: [src/tools/notion.ts:340](https://github.com/anuma-ai/sdk/blob/main/src/tools/notion.ts#340)

Calls the portal's Notion MCP endpoint with a tool name and its arguments,
and resolves to the response status + parsed JSON. Consumers wire this to
`POST {portalBaseUrl}/api/v1/connectors/notion/mcp` with the user's Privy
bearer and a JSON body `{ tool, arguments }`; the portal mints the Notion
token and runs the MCP handshake server-side.

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

`tool`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`args`

</td>
<td>

`Record`<`string`, `unknown`>

</td>
</tr>
</tbody>
</table>

## Returns

`Promise`<{ `json`: `unknown`; `status`: `number`; }>
