# OpenaiChatCompletionNewParamsWebSearchOptions

> **OpenaiChatCompletionNewParamsWebSearchOptions** = `object`

Defined in: [src/client/types.gen.ts:4230](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4230)

This tool searches the web for relevant results to use in a response. Learn more
about the
[web search tool](https://platform.openai.com/docs/guides/tools-web-search?api-mode=chat).

## Properties

### any?

> `optional` **any**: `unknown`

Defined in: [src/client/types.gen.ts:4231](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4231)

***

### search\_context\_size?

> `optional` **search\_context\_size**: `string`

Defined in: [src/client/types.gen.ts:4238](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4238)

High level guidance for the amount of context window space to use for the
search. One of `low`, `medium`, or `high`. `medium` is the default.

Any of "low", "medium", "high".

***

### user\_location?

> `optional` **user\_location**: [`OpenaiChatCompletionNewParamsWebSearchOptionsUserLocation`](OpenaiChatCompletionNewParamsWebSearchOptionsUserLocation.md)

Defined in: [src/client/types.gen.ts:4239](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#4239)
