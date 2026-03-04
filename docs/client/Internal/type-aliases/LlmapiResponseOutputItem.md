# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:1334](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1334)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:1338](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1338)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:1342](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1342)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1346](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1346)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:1350](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1350)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1354](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1354)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:1358](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1358)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:1362](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1362)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:1366](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1366)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:1370](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1370)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:1374](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1374)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:1378](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1378)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:1382](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1382)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:1386](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1386)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
