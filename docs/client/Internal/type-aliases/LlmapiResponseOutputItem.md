# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:1448](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1448)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:1452](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1452)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:1456](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1456)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1460](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1460)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:1464](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1464)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1468](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1468)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1472](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1472)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:1476](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1476)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:1480](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1480)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:1484](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1484)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1488](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1488)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1492](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1492)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:1496](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1496)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1500](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1500)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
