# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:1278](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1278)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:1282](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1282)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:1286](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1286)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1290](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1290)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:1294](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1294)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1298](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1298)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1302](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1302)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:1306](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1306)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:1310](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1310)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:1314](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1314)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1318](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1318)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1322](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1322)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:1326](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1326)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1330](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1330)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
