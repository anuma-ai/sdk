# useChatStorage()

> **useChatStorage**(`options`): [`UseChatStorageResult`](../interfaces/UseChatStorageResult.md)

Defined in: [src/react/useChatStorage.ts:219](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useChatStorage.ts#L219)

A React hook that wraps useChat with automatic message persistence using WatermelonDB.

This hook provides all the functionality of useChat plus automatic storage of
messages and conversations to a WatermelonDB database. Messages are automatically
saved when sent and when responses are received.

## Parameters

### options

[`UseChatStorageOptions`](../interfaces/UseChatStorageOptions.md)

Configuration options

## Returns

[`UseChatStorageResult`](../interfaces/UseChatStorageResult.md)

An object containing chat state, methods, and storage operations

## Example

```tsx
import { Database } from '@nozbe/watermelondb';
import { useChatStorage } from '@reverbia/sdk/react';

function ChatComponent({ database }: { database: Database }) {
  const {
    isLoading,
    sendMessage,
    conversationId,
    getMessages,
    createConversation,
  } = useChatStorage({
    database,
    getToken: async () => getAuthToken(),
    onData: (chunk) => setResponse((prev) => prev + chunk),
  });

  const handleSend = async () => {
    const result = await sendMessage({
      content: 'Hello, how are you?',
      model: 'gpt-4o-mini',
      includeHistory: true, // Include previous messages from this conversation
    });

    if (result.error) {
      console.error('Error:', result.error);
    } else {
      console.log('User message stored:', result.userMessage);
      console.log('Assistant message stored:', result.assistantMessage);
    }
  };

  return (
    <div>
      <button onClick={handleSend} disabled={isLoading}>Send</button>
    </div>
  );
}
```
