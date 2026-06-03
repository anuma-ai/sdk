# LlmapiChatCompletionResponse

> **LlmapiChatCompletionResponse** = `Omit`<`GeneratedLlmapiChatCompletionResponse`, `"usage"`> & `object`

Defined in: [src/clientCompat.ts:77](https://github.com/anuma-ai/sdk/blob/main/src/clientCompat.ts#77)

Override the generated `LlmapiChatCompletionResponse` so legacy top-level
fields (`tools_checksum`, `tool_call_events`, `inference_id`, ...) and
cost-on-usage (`usage.cost_micro_usd`, `usage.credits_used`) remain readable
by SDK consumers that haven't migrated to the new `portal` envelope.

The portal returns the strict OpenAI-compliant shape on the wire; the SDK's
streaming `buildFinalResponse` populates both paths so reads on either side
succeed. Non-streaming direct calls (`postApiV1ChatCompletions`) return only
the wire shape — legacy fields are `undefined` there, matching the optional
typing below.

TODO(deprecate-legacy-chat-completion-mirrors) \[#548]: the legacy top-level
fields and the cost-on-`usage` fields below are slated for removal in the
next SDK MAJOR bump, paired with the mirror-emission in
strategies/completions.ts `buildFinalResponse`. See that TODO for the full
deprecation plan.

## Type Declaration

### client\_injected\_tools?

> `optional` **client\_injected\_tools**: `string`\[]

### image\_model?

> `optional` **image\_model**: `string`

### inference\_id?

> `optional` **inference\_id**: `string`

### messages?

> `optional` **messages**: [`LlmapiMessage`](LlmapiMessage.md)\[]

### portal\_injected\_tools?

> `optional` **portal\_injected\_tools**: `string`\[]

### tool\_call\_events?

> `optional` **tool\_call\_events**: [`LlmapiToolCallEvent`](LlmapiToolCallEvent.md)\[]

### tools\_checksum?

> `optional` **tools\_checksum**: `string`

### usage?

> `optional` **usage**: [`LlmapiChatCompletionUsage`](LlmapiChatCompletionUsage.md)
