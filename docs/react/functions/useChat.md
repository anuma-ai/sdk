# useChat()

> **useChat**(`options?`): `UseChatResult`

Defined in: [src/react/useChat.ts:128](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChat.ts#L128)

A React hook for managing chat completions with authentication.

This hook provides a convenient way to send chat messages to the LLM API
with automatic token management and loading state handling.
Streaming is enabled by default for better user experience.

## Parameters

### options?

`BaseUseChatOptions`

Optional configuration object

## Returns

`UseChatResult`

An object containing:
  - `isLoading`: A boolean indicating whether a request is currently in progress
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
