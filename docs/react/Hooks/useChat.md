# useChat

> **useChat**(`options?`: `object`): `UseChatResult`

Defined in: [src/react/useChat.ts:150](https://github.com/anuma-ai/sdk/blob/main/src/react/useChat.ts#150)

A React hook for managing chat completions with authentication.

This hook provides a convenient way to send chat messages to the LLM API
with automatic token management and loading state handling.
Streaming is enabled by default for better user experience.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options?`

</td>
<td>

`object`

</td>
<td>

Optional configuration object

</td>
</tr>
<tr>
<td>

`options.apiType?`

</td>
<td>

`ApiType`

</td>
<td>

Which API endpoint to use. Default: "auto"

* "auto": automatically selects the best API based on model support
* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

</td>
</tr>
<tr>
<td>

`options.baseUrl?`

</td>
<td>

`string`

</td>
<td>

Optional base URL for the API requests.

</td>
</tr>
<tr>
<td>

`options.getToken?`

</td>
<td>

() => `Promise`<`string` | `null`>

</td>
<td>

An async function that returns an authentication token.
This token will be used as a Bearer token in the Authorization header.
If not provided, `sendMessage` will return an error.

</td>
</tr>
<tr>
<td>

`options.onData?`

</td>
<td>

(`chunk`: `string`) => `void`

</td>
<td>

Callback function to be called when a new data chunk is received.

</td>
</tr>
<tr>
<td>

`options.onError?`

</td>
<td>

(`error`: `Error`) => `void`

</td>
<td>

Callback function to be called when an unexpected error is encountered.

**Note:** This callback is NOT called for aborted requests (via `stop()` or
component unmount). Aborts are intentional actions and are not considered
errors. To detect aborts, check the `error` field in the `sendMessage` result:
`result.error === "Request aborted"`.

</td>
</tr>
<tr>
<td>

`options.onFinish?`

</td>
<td>

(`response`: `ApiResponse`) => `void`

</td>
<td>

Callback function to be called when the chat completion finishes successfully.
Receives raw API response - either Responses API or Completions API format.

</td>
</tr>
<tr>
<td>

`options.onPiiRedacted?`

</td>
<td>

(`matches`: [`PiiMatch`](../../expo/Internal/interfaces/PiiMatch.md)\[]) => `void`

</td>
<td>

Called with the PII matches found whenever outbound messages are redacted.
Useful for surfacing what was redacted to the user. Only fired when
`piiRedaction` is active and at least one match was found.

</td>
</tr>
<tr>
<td>

`options.onServerToolCall?`

</td>
<td>

(`toolCall`: `ServerToolCallEvent`) => `void`

</td>
<td>

Callback function to be called when a server-side tool (MCP) is invoked during streaming.
Use this to show activity indicators like "Searching..." in the UI.

</td>
</tr>
<tr>
<td>

`options.onStepFinish?`

</td>
<td>

(`event`: [`StepFinishEvent`](../Internal/type-aliases/StepFinishEvent.md)) => `void`

</td>
<td>

Called after each tool execution round completes.
Receives the round index, model content, tool calls, results, and token usage.
Useful for progress indicators, cost tracking, and custom early-exit logic.

</td>
</tr>
<tr>
<td>

`options.onThinking?`

</td>
<td>

(`chunk`: `string`) => `void`

</td>
<td>

Callback function to be called when thinking/reasoning content is received.
This is called with delta chunks as the model "thinks" through a problem.

</td>
</tr>
<tr>
<td>

`options.onToolCall?`

</td>
<td>

(`toolCall`: [`LlmapiToolCall`](../../client/Internal/type-aliases/LlmapiToolCall.md)) => `void`

</td>
<td>

Callback function to be called when a tool call is requested by the LLM
but no executor is registered for it (e.g. server-side tools).

</td>
</tr>
<tr>
<td>

`options.onToolCallArgumentsDelta?`

</td>
<td>

(`event`: [`ToolCallArgumentsDeltaEvent`](../Internal/type-aliases/ToolCallArgumentsDeltaEvent.md)) => `void`

</td>
<td>

Called with partial tool call arguments as they stream in.
Use for live preview of artifacts (HTML, slides) being generated.

</td>
</tr>
<tr>
<td>

`options.piiRedaction?`

</td>
<td>

`boolean` | [`PiiRedactor`](../../expo/Internal/classes/PiiRedactor.md)

</td>
<td>

Enable best-effort, client-side PII obfuscation (NOT a compliance
guarantee). Outbound message text is scanned for personally identifiable
information (emails, phone numbers, SSNs, credit cards, API keys,
addresses) and matches are replaced with tagged placeholders before
reaching the LLM provider; both streamed and final responses are
de-anonymized automatically.

Detection is regex-based and does not cover names, non-text content
(images/files/attachments), or model-generated tool-call arguments.

* `true`: the hook keeps one redactor and shares placeholder state across
  turns (per conversation in `useChatStorage`)
* `PiiRedactor` instance: bring your own; tune categories via
  `new PiiRedactor({ excludeCategories, extraPatterns })`

</td>
</tr>
<tr>
<td>

`options.preProcessors?`

</td>
<td>

`PromptPreProcessor`\[]

</td>
<td>

Pre-processors run after the last user message is received but before the
first LLM request. Each receives the prompt text and a shared embedding
(computed once per request) and may return messages to enrich the
conversation. See `createWebSearchPreProcessor`,
`createCryptoPricePreProcessor`, `createStockPricePreProcessor`,
`createWeatherPreProcessor`, or write a custom one matching
`PromptPreProcessor`.

</td>
</tr>
<tr>
<td>

`options.smoothing?`

</td>
<td>

`boolean` | `StreamSmoothingConfig`

</td>
<td>

Controls adaptive output smoothing for streaming responses.
Fast models can return text faster than is comfortable to read — smoothing
buffers incoming chunks and releases them at a consistent, adaptive pace.

* `true` or omitted: enabled with defaults (200→400 chars/sec over 3s)
* `false`: disabled, callbacks fire immediately with raw chunks
* `StreamSmoothingConfig`: custom speed/ramp configuration

**Default**

```ts
true
```

</td>
</tr>
</tbody>
</table>

## Returns

`UseChatResult`

## Example

```tsx
// Basic usage with API
const { isLoading, sendMessage, stop } = useChat({
  getToken: async () => await getAuthToken(),
  onFinish: (response) => console.log("Chat finished:", response),
  onError: (error) => console.error("Chat error:", error)
});

const handleSend = async () => {
  const result = await sendMessage({
    messages: [{ role: 'user', content: [{ type: 'text', text: 'Hello!' }] }],
    model: 'your-provider/your-model'
  });
};

// Using extended thinking
const result = await sendMessage({
  messages: [{ role: 'user', content: [{ type: 'text', text: 'Solve this complex problem...' }] }],
  model: 'your-provider/your-model',
  thinking: { type: 'enabled', budget_tokens: 10000 },
  onThinking: (chunk) => console.log('Thinking:', chunk)
});

// Using reasoning
const result = await sendMessage({
  messages: [{ role: 'user', content: [{ type: 'text', text: 'Reason through this...' }] }],
  model: 'your-provider/your-model',
  reasoning: { effort: 'high', summary: 'detailed' }
});
```
