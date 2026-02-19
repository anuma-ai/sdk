# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:1038](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1038)

## Properties

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1042](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1042)

ClientInjectedTools are tool names the client provided in the original request.

***

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:1046](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1046)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:1047](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1047)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:1051](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1051)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:1058](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1058)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:1062](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1062)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:1066](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1066)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:1070](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1070)

Output is the array of output items (OpenAI Responses API format)

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:1074](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1074)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:1078](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1078)

ToolCallEvents is an array of tool call events.

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:1082](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1082)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:1083](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L1083)
