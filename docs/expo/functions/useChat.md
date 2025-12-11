---
title: useChat
---

[SDK Documentation](../../README.md) / [expo](../README.md) / useChat

# Function: useChat()

> **useChat**(`options?`): `UseChatResult`

Defined in: [expo/useChat.ts:108](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChat.ts#L108)

A React hook for managing chat completions with authentication.

**React Native version** - This is a lightweight version that only supports
API-based chat completions. Local chat and client-side tools are not available
in React Native.

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
