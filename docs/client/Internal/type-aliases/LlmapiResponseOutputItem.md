# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:973](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L973)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:977](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L977)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:981](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L981)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:985](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L985)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:989](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L989)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:993](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L993)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:997](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L997)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:1001](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1001)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:1005](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1005)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:1009](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1009)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1013](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1013)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1017](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1017)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:1021](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1021)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1025](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1025)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
