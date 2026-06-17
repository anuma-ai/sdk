# LlmapiResponseOutputItem

> **LlmapiResponseOutputItem** = `object`

Defined in: [src/client/types.gen.ts:752](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#752)

## Properties

### arguments?

> `optional` **arguments**: `string`

Defined in: [src/client/types.gen.ts:756](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#756)

Arguments is the function arguments for function\_call and mcp\_call types

***

### call\_id?

> `optional` **call\_id**: `string`

Defined in: [src/client/types.gen.ts:760](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#760)

CallID is the call ID for function\_call and mcp\_call types

***

### content?

> `optional` **content**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:764](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#764)

Content is the content array for message and reasoning types

***

### error?

> `optional` **error**: `string`

Defined in: [src/client/types.gen.ts:768](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#768)

Error is the MCP error message for mcp\_call types

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:772](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#772)

ID is the unique identifier for this output item

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:776](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#776)

Name is the function name for function\_call and mcp\_call types

***

### output?

> `optional` **output**: `string`

Defined in: [src/client/types.gen.ts:780](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#780)

Output is the MCP tool output for mcp\_call types

***

### role?

> `optional` **role**: `string`

Defined in: [src/client/types.gen.ts:784](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#784)

Role is the role for message types (e.g., "assistant")

***

### server\_label?

> `optional` **server\_label**: `string`

Defined in: [src/client/types.gen.ts:788](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#788)

ServerLabel is the MCP server label for mcp\_call and mcp\_list\_tools types

***

### status?

> `optional` **status**: `string`

Defined in: [src/client/types.gen.ts:792](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#792)

Status is the status of this output item (e.g., "completed")

***

### summary?

> `optional` **summary**: [`LlmapiResponseOutputContent`](LlmapiResponseOutputContent.md)\[]

Defined in: [src/client/types.gen.ts:796](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#796)

Summary is the reasoning summary for reasoning types

***

### tools?

> `optional` **tools**: [`LlmapiMcpTool`](LlmapiMcpTool.md)\[]

Defined in: [src/client/types.gen.ts:800](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#800)

Tools is the list of available tools for mcp\_list\_tools types

***

### type?

> `optional` **type**: `string`

Defined in: [src/client/types.gen.ts:804](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#804)

Type is the output item type (e.g., "message", "function\_call", "reasoning", "mcp\_call")
