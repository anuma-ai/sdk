# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:1486](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1486)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:1490](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1490)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:1494](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1494)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1498](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1498)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:1502](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1502)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1506](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1506)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1510](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1510)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:1514](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1514)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:1518](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1518)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:1522](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1522)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1526](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1526)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1530](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1530)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:1534](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1534)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1538](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1538)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
