# selectTool()

> **selectTool**(`userMessage`, `tools`, `options`): `Promise`\<[`ToolSelectionResult`](../interfaces/ToolSelectionResult.md)\>

Defined in: [src/lib/tools/selector.ts:183](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/selector.ts#L183)

Select a tool based on user message using an in-browser model

## Parameters

### userMessage

`string`

### tools

[`ClientTool`](../interfaces/ClientTool.md)[]

### options

`ToolSelectorOptions` = `{}`

## Returns

`Promise`\<[`ToolSelectionResult`](../interfaces/ToolSelectionResult.md)\>
