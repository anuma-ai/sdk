# LlmapiPortalChatCompletionResponse

> **LlmapiPortalChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:662](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#662)

Portal carries non-OpenAI fields scoped to the portal under a single key so they don't
collide with the embedded SDK type's custom JSON marshaling.

## Properties

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:666](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#666)

ClientInjectedTools are tool names the client provided in the original request.

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:670](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#670)

CostMicroUSD is what we charge the user (today identical to what we paid the provider).

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:674](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#674)

CreditsUsed is CostMicroUSD in credits.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:675](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#675)

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:681](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#681)

ImageModel is set when an image generation tool was called during the request.
This allows the client to detect that the response contains generated images
and render them appropriately, even when the orchestrating model is a text model.

***

### inference\_id?

> `optional` **inference\_id**: `string`

Defined in: [src/client/types.gen.ts:685](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#685)

InferenceID is the unique identifier for this inference request.

***

### init\_completion\_tokens?

> `optional` **init\_completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:689](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#689)

InitCompletionTokens are the completion tokens from the first LLM call (before the MCP tool loop).

***

### init\_prompt\_tokens?

> `optional` **init\_prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:693](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#693)

InitPromptTokens are the prompt tokens from the first LLM call (before the MCP tool loop).

***

### messages?

> `optional` **messages**: [`OpenaiChatCompletionMessageParamUnion`](OpenaiChatCompletionMessageParamUnion.md)\[]

Defined in: [src/client/types.gen.ts:700](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#700)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:704](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#704)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### pricing\_source?

> `optional` **pricing\_source**: `string`

Defined in: [src/client/types.gen.ts:708](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#708)

PricingSource is which lookup calculated the costs.

***

### provider\_cost\_micro\_usd?

> `optional` **provider\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:712](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#712)

ProviderCostMicroUSD is what we paid the provider.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:716](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#716)

ToolCallEvents is an array of tool call events.

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:720](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#720)

ToolCostMicroUSD is the aggregate cost from MCP tool calls (subset of CostMicroUSD).

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:724](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#724)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.
