# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:1022](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1022)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:1026](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1026)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:1030](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1030)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1034](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1034)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:1038](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1038)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1042](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1042)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1046](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1046)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:1050](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1050)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:1054](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1054)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:1058](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1058)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1062](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1062)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1066](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1066)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:1070](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1070)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1074](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1074)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
