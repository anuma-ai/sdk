# ToolSelectionResult

Defined in: [src/lib/tools/types.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L37)

Result of a tool selection operation

## Properties

### confidence?

> `optional` **confidence**: `number`

Defined in: [src/lib/tools/types.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L45)

Confidence score (0-1) of the selection

***

### parameters?

> `optional` **parameters**: `Record`\<`string`, `unknown`\>

Defined in: [src/lib/tools/types.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L43)

Extracted parameters for the tool

***

### toolName?

> `optional` **toolName**: `string`

Defined in: [src/lib/tools/types.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L41)

Name of the selected tool (if any)

***

### toolSelected

> **toolSelected**: `boolean`

Defined in: [src/lib/tools/types.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/tools/types.ts#L39)

Whether a tool was selected
