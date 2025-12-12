# ClientTool

Defined in: [lib/tools/types.ts:20](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L20)

Definition for a client-side tool that can be executed in the browser

## Properties

### description

> **description**: `string`

Defined in: [lib/tools/types.ts:24](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L24)

Human-readable description of what the tool does

***

### execute()

> **execute**: (`params`) => `unknown`

Defined in: [lib/tools/types.ts:31](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L31)

The function to execute when the tool is called.
Receives extracted parameters and returns a result.

#### Parameters

##### params

`Record`\<`string`, `unknown`\>

#### Returns

`unknown`

***

### name

> **name**: `string`

Defined in: [lib/tools/types.ts:22](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L22)

Unique identifier for the tool

***

### parameters?

> `optional` **parameters**: [`ToolParameter`](ToolParameter.md)[]

Defined in: [lib/tools/types.ts:26](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L26)

Parameters the tool accepts
