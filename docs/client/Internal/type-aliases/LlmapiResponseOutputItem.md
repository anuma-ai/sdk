# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:1866](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1866)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:1870](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1870)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:1874](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1874)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1878](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1878)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:1882](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1882)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1886](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1886)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1890](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1890)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:1894](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1894)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:1898](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1898)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:1902](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1902)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1906](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1906)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1910](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1910)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:1914](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1914)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1918](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1918)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
