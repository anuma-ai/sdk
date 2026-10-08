# PromptPreProcessor

> **PromptPreProcessor** = (`ctx`: [`PromptPreProcessorContext`](PromptPreProcessorContext.md)) => [`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[] | `void` | `Promise`<[`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[] | `void`>

Defined in: [src/lib/chat/preProcessor.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/preProcessor.ts#17)

Returns context messages to insert before the latest user message, or nothing to leave
the conversation unchanged. Thrown errors are caught by the tool loop
so a failing pre-processor does not abort the LLM request.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`ctx`

</td>
<td>

[`PromptPreProcessorContext`](PromptPreProcessorContext.md)

</td>
</tr>
</tbody>
</table>

## Returns

[`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[] | `void` | `Promise`<[`LlmapiMessage`](../../../client/Internal/type-aliases/LlmapiMessage.md)\[] | `void`>
