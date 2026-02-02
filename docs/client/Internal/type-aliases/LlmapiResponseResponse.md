# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:907](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L907)

## Properties

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:911](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L911)

Created is the Unix timestamp of creation (created\_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:912](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L912)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:916](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L916)

ID is the unique response identifier

***

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

Defined in: [src/client/types.gen.ts:923](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L923)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (local/client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:927](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L927)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:931](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L931)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)\[]

Defined in: [src/client/types.gen.ts:935](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L935)

Output is the array of output items (OpenAI Responses API format)

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:939](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L939)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:940](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L940)
