# LlmapiPortalChatCompletionResponse

> **LlmapiPortalChatCompletionResponse** = `object`

Defined in: [src/client/types.gen.ts:663](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#663)

Portal carries non-OpenAI fields scoped to the portal under a single key so they don't
collide with the embedded SDK type's custom JSON marshaling.

## Properties

### cached\_tokens?

> `optional` **cached\_tokens**: `number`

Defined in: [src/client/types.gen.ts:668](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#668)

CachedTokens are the prompt tokens served from the provider's cache (cache-hit reads),
summed across the MCP tool loop. Omitted from the response when zero (no cache hit reported).

***

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:672](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#672)

ClientInjectedTools are tool names the client provided in the original request.

***

### cost\_micro\_usd?

> `optional` **cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:676](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#676)

CostMicroUSD is what we charge the user (today identical to what we paid the provider).

***

### credits\_used?

> `optional` **credits\_used**: `number`

Defined in: [src/client/types.gen.ts:680](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#680)

CreditsUsed is CostMicroUSD in credits.

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiChatCompletionExtraFields`](LlmapiChatCompletionExtraFields.md)

Defined in: [src/client/types.gen.ts:681](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#681)

***

### image\_model?

> `optional` **image\_model**: `string`

Defined in: [src/client/types.gen.ts:687](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#687)

ImageModel is set when an image generation tool was called during the request.
This allows the client to detect that the response contains generated images
and render them appropriately, even when the orchestrating model is a text model.

***

### inference\_id?

> `optional` **inference\_id**: `string`

Defined in: [src/client/types.gen.ts:691](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#691)

InferenceID is the unique identifier for this inference request.

***

### init\_completion\_tokens?

> `optional` **init\_completion\_tokens**: `number`

Defined in: [src/client/types.gen.ts:695](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#695)

InitCompletionTokens are the completion tokens from the first LLM call (before the MCP tool loop).

***

### init\_prompt\_tokens?

> `optional` **init\_prompt\_tokens**: `number`

Defined in: [src/client/types.gen.ts:699](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#699)

InitPromptTokens are the prompt tokens from the first LLM call (before the MCP tool loop).

***

### messages?

> `optional` **messages**: [`OpenaiChatCompletionMessageParamUnion`](OpenaiChatCompletionMessageParamUnion.md)\[]

Defined in: [src/client/types.gen.ts:706](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#706)

Messages contains the full conversation history when local tools need execution.
This is populated when the model requests tools that are not MCP tools (client-side tools).
The client should execute these tools and send a new request with this message history
plus the tool results appended.

***

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

Defined in: [src/client/types.gen.ts:710](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#710)

PortalInjectedTools are tool names the portal's classifier added to the request.

***

### pricing\_source?

> `optional` **pricing\_source**: `string`

Defined in: [src/client/types.gen.ts:714](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#714)

PricingSource is which lookup calculated the costs.

***

### provider\_cost\_micro\_usd?

> `optional` **provider\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:718](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#718)

ProviderCostMicroUSD is what we paid the provider.

***

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

Defined in: [src/client/types.gen.ts:722](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#722)

ToolCallEvents is an array of tool call events.

***

### tool\_cost\_micro\_usd?

> `optional` **tool\_cost\_micro\_usd**: `number`

Defined in: [src/client/types.gen.ts:726](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#726)

ToolCostMicroUSD is the aggregate cost from MCP tool calls (subset of CostMicroUSD).

***

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

Defined in: [src/client/types.gen.ts:730](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#730)

ToolsChecksum is the checksum of the tool schemas used by the AI Portal.
