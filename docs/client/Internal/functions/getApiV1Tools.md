# getApiV1Tools

> **getApiV1Tools**<`ThrowOnError`>(`options?`: [`Options`](../type-aliases/Options.md)<[`GetApiV1ToolsData`](../type-aliases/GetApiV1ToolsData.md), `ThrowOnError`>): `RequestResult`<[`GetApiV1ToolsResponses`](../type-aliases/GetApiV1ToolsResponses.md), [`GetApiV1ToolsErrors`](../type-aliases/GetApiV1ToolsErrors.md), `ThrowOnError`>

Defined in: [src/client/sdk.gen.ts:874](https://github.com/anuma-ai/sdk/blob/main/src/client/sdk.gen.ts#874)

List available tools

Returns a map of available MCP tool schemas indexed by tool name.

## Type Parameters

<table>
<thead>
<tr>
<th>Type Parameter</th>
<th>Default type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`ThrowOnError` *extends* `boolean`

</td>
<td>

`false`

</td>
</tr>
</tbody>
</table>

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

`options?`

</td>
<td>

[`Options`](../type-aliases/Options.md)<[`GetApiV1ToolsData`](../type-aliases/GetApiV1ToolsData.md), `ThrowOnError`>

</td>
</tr>
</tbody>
</table>

## Returns

`RequestResult`<[`GetApiV1ToolsResponses`](../type-aliases/GetApiV1ToolsResponses.md), [`GetApiV1ToolsErrors`](../type-aliases/GetApiV1ToolsErrors.md), `ThrowOnError`>
