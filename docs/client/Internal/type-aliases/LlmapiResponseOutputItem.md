# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:2291](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2291)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:2295](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2295)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:2299](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2299)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:2303](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2303)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:2307](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2307)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:2311](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2311)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:2315](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2315)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:2319](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2319)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:2323](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2323)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:2327](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2327)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:2331](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2331)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:2335](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2335)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:2339](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2339)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:2343](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2343)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
