# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:1477](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1477)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:1481](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1481)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:1485](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1485)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1489](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1489)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:1493](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1493)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1497](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1497)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1501](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1501)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:1505](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1505)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:1509](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1509)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:1513](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1513)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1517](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1517)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1521](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1521)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:1525](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1525)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1529](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1529)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
