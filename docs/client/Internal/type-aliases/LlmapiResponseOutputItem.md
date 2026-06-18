# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:775](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#775)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:779](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#779)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:783](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#783)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:787](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#787)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:791](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#791)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:795](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#795)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:799](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#799)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:803](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#803)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:807](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#807)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:811](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#811)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:815](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#815)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:819](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#819)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:823](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#823)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:827](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#827)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
