# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:1380](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1380)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:1384](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1384)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:1388](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1388)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1392](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1392)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:1396](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1396)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1400](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1400)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1404](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1404)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:1408](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1408)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:1412](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1412)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:1416](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1416)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1420](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1420)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1424](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1424)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:1428](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1428)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1432](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1432)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
