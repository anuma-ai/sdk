# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:1900](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1900)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:1904](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1904)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:1908](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1908)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1912](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1912)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:1916](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1916)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1920](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1920)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1924](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1924)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:1928](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1928)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:1932](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1932)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:1936](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1936)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1940](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1940)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1944](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1944)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:1948](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1948)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1952](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1952)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
