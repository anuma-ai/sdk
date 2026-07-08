# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:781](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#781)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:785](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#785)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:789](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#789)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:793](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#793)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:797](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#797)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:801](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#801)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:805](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#805)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:809](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#809)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:813](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#813)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:817](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#817)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:821](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#821)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:825](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#825)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:829](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#829)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:833](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#833)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
