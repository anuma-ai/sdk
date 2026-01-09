# useChat

> **useChat**(`options?`: `object`): `UseChatResult`

Defined in: [src/expo/useChat.ts:117](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChat.ts#L117)

A React hook for managing chat completions with authentication.

**React Native version** - This is a lightweight version that only supports
API-based chat completions. Local chat and client-side tools are not available
in React Native.

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

{ `baseUrl?`: `string`; `getToken?`: () => `Promise`<`string` | `null`>; `onData?`: (`chunk`: `string`) => `void`; `onError?`: (`error`: `Error`) => `void`; `onFinish?`: (`response`: [`LlmapiResponseResponse`](../../client/Internal/type-aliases/LlmapiResponseResponse.md)) => `void`; `onThinking?`: (`chunk`: `string`) => `void`; `onToolCall?`: (`toolCall`: [`LlmapiToolCall`](../../client/Internal/type-aliases/LlmapiToolCall.md)) => `void`; }

</td>
<td>

Optional configuration object

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

(`response`: [`LlmapiResponseResponse`](../../client/Internal/type-aliases/LlmapiResponseResponse.md)) => `void`

</td>
<td>

Callback function to be called when the chat completion finishes successfully.

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

Callback function to be called when a tool call is requested by the LLM.
This is called for tools that don't have an executor or have autoExecute=false.
The app should execute the tool and send the result back.

</td>
</tr>
</tbody>
</table>

## Returns

`UseChatResult`

An object containing:

* `isLoading`: A boolean indicating whether a request is currently in progress
* `sendMessage`: An async function to send chat messages
* `stop`: A function to abort the current request

## Example

```tsx
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
```
