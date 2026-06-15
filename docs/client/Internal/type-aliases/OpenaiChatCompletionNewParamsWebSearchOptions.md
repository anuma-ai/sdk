# OpenaiChatCompletionNewParamsWebSearchOptions

> **OpenaiChatCompletionNewParamsWebSearchOptions** = `object`

Defined in: [src/client/types.gen.ts:3479](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3479)

This tool searches the web for relevant results to use in a response. Learn more
about the
[web search tool](https://platform.openai.com/docs/guides/tools-web-search?api-mode=chat).

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:3480](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3480)

***

### search\_context\_size?

> `optional` **search\_context\_size**: `string`

Defined in: [src/client/types.gen.ts:3487](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3487)

High level guidance for the amount of context window space to use for the
search. One of `low`, `medium`, or `high`. `medium` is the default.

Any of "low", "medium", "high".

***

### user\_location?

> `optional` **user\_location**: [`OpenaiChatCompletionNewParamsWebSearchOptionsUserLocation`](OpenaiChatCompletionNewParamsWebSearchOptionsUserLocation.md)

Defined in: [src/client/types.gen.ts:3488](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3488)
