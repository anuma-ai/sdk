# useChat()

> **useChat**(`options?`): `UseChatResult`

Defined in: [src/react/useChat.ts:170](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChat.ts#L170)

A React hook for managing chat completions with authentication.

This hook provides a convenient way to send chat messages to the LLM API
with automatic token management and loading state handling.
Streaming is enabled by default for better user experience.

## Parameters

### options?

`UseChatOptions`

Optional configuration object

## Returns

`UseChatResult`

An object containing:
  - `isLoading`: A boolean indicating whether a request is currently in progress
  - `isSelectingTool`: A boolean indicating whether tool selection is in progress
  - `sendMessage`: An async function to send chat messages
  - `stop`: A function to abort the current request

## Example

```tsx
// Basic usage with API
const { isLoading, sendMessage, stop } = useChat({
  getToken: async () => await getAuthToken(),
  onFinish: (response) => console.log("Chat finished:", response),
  onError: (error) => console.error("Chat error:", error)
});

// With client-side tools
const { isLoading, isSelectingTool, sendMessage } = useChat({
  getToken: async () => await getAuthToken(),
  tools: [
    {
      name: "get_weather",
      description: "Get the current weather for a location",
      parameters: [
        { name: "location", type: "string", description: "City name", required: true }
      ],
      execute: async ({ location }) => {
        // Your weather API call here
        return { temperature: 72, condition: "sunny" };
      }
    }
  ],
  onToolExecution: (result) => {
    console.log("Tool executed:", result.toolName, result.result);
  }
});

const handleSend = async () => {
  const result = await sendMessage({
    messages: [{ role: 'user', content: 'What is the weather in Paris?' }],
    model: 'gpt-4o-mini'
  });

  if (result.toolExecution) {
    console.log("Tool was called:", result.toolExecution);
  }
};
```
