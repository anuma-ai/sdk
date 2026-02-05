# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:851](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L851)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:855](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L855)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:859](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L859)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:863](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L863)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:867](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L867)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:871](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L871)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:875](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L875)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:879](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L879)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:883](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L883)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:887](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L887)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:891](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L891)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:895](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L895)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:899](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L899)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:903](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L903)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
