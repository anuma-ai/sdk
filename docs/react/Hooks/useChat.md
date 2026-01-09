# useChat

> **useChat**(`options?`: { `apiType?`: `ApiType`; `baseUrl?`: `string`; `getToken?`: () => `Promise`<`string` | `null`>; `onData?`: (`chunk`: `string`) => `void`; `onError?`: (`error`: `Error`) => `void`; `onFinish?`: (`response`: [`LlmapiResponseResponse`](../../client/Internal/type-aliases/LlmapiResponseResponse.md)) => `void`; `onThinking?`: (`chunk`: `string`) => `void`; `onToolCall?`: (`toolCall`: [`LlmapiToolCall`](../../client/Internal/type-aliases/LlmapiToolCall.md)) => `void`; }): `UseChatResult`

Defined in: [src/react/useChat.ts:142](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChat.ts#L142)

A React hook for managing chat completions with authentication.

This hook provides a convenient way to send chat messages to the LLM API
with automatic token management and loading state handling.
Streaming is enabled by default for better user experience.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options?` | { `apiType?`: `ApiType`; `baseUrl?`: `string`; `getToken?`: () => `Promise`<`string` | `null`>; `onData?`: (`chunk`: `string`) => `void`; `onError?`: (`error`: `Error`) => `void`; `onFinish?`: (`response`: [`LlmapiResponseResponse`](../../client/Internal/type-aliases/LlmapiResponseResponse.md)) => `void`; `onThinking?`: (`chunk`: `string`) => `void`; `onToolCall?`: (`toolCall`: [`LlmapiToolCall`](../../client/Internal/type-aliases/LlmapiToolCall.md)) => `void`; } | Optional configuration object |
| `options.apiType?` | `ApiType` | Which API endpoint to use. Default: "responses" - "responses": OpenAI Responses API (supports thinking, reasoning, conversations) - "completions": OpenAI Chat Completions API (wider model compatibility) |
| `options.baseUrl?` | `string` | Optional base URL for the API requests. |
| `options.getToken?` | () => `Promise`<`string` | `null`> | An async function that returns an authentication token. This token will be used as a Bearer token in the Authorization header. If not provided, `sendMessage` will return an error. |
| `options.onData?` | (`chunk`: `string`) => `void` | Callback function to be called when a new data chunk is received. |
| `options.onError?` | (`error`: `Error`) => `void` | Callback function to be called when an unexpected error is encountered. **Note:** This callback is NOT called for aborted requests (via `stop()` or component unmount). Aborts are intentional actions and are not considered errors. To detect aborts, check the `error` field in the `sendMessage` result: `result.error === "Request aborted"`. |
| `options.onFinish?` | (`response`: [`LlmapiResponseResponse`](../../client/Internal/type-aliases/LlmapiResponseResponse.md)) => `void` | Callback function to be called when the chat completion finishes successfully. |
| `options.onThinking?` | (`chunk`: `string`) => `void` | Callback function to be called when thinking/reasoning content is received. This is called with delta chunks as the model "thinks" through a problem. |
| `options.onToolCall?` | (`toolCall`: [`LlmapiToolCall`](../../client/Internal/type-aliases/LlmapiToolCall.md)) => `void` | Callback function to be called when a tool call is requested by the LLM. This is called for tools that don't have an executor or have autoExecute=false. The app should execute the tool and send the result back. |

## Returns

`UseChatResult`

An object containing:

* `isLoading`: A boolean indicating whether a request is currently in progress
* `sendMessage`: An async function to send chat messages
* `stop`: A function to abort the current request

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
    model: 'gpt-4o-mini'
  });
};

// Using extended thinking (Anthropic Claude)
const result = await sendMessage({
  messages: [{ role: 'user', content: [{ type: 'text', text: 'Solve this complex problem...' }] }],
  model: 'anthropic/claude-3-7-sonnet-20250219',
  thinking: { type: 'enabled', budget_tokens: 10000 },
  onThinking: (chunk) => console.log('Thinking:', chunk)
});

// Using reasoning (OpenAI o-series)
const result = await sendMessage({
  messages: [{ role: 'user', content: [{ type: 'text', text: 'Reason through this...' }] }],
  model: 'openai/o1',
  reasoning: { effort: 'high', summary: 'detailed' }
});
```
