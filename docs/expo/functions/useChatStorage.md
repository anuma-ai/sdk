# useChatStorage()

> **useChatStorage**(`options`): [`UseChatStorageResult`](../interfaces/UseChatStorageResult.md)

Defined in: [src/expo/useChatStorage.ts:148](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L148)

A React hook that wraps useChat with automatic message persistence using WatermelonDB.

**Expo/React Native version** - This is a lightweight version that only supports
API-based chat completions. Local chat and client-side tools are not available.

## Parameters

### options

`BaseUseChatStorageOptions`

Configuration options

## Returns

[`UseChatStorageResult`](../interfaces/UseChatStorageResult.md)

An object containing chat state, methods, and storage operations

## Example

```tsx
import { Database } from '@nozbe/watermelondb';
import { useChatStorage } from '@reverbia/sdk/expo';

function ChatScreen({ database }: { database: Database }) {
  const {
    isLoading,
    sendMessage,
    conversationId,
    getMessages,
  } = useChatStorage({
    database,
    getToken: async () => getAuthToken(),
    onData: (chunk) => setResponse((prev) => prev + chunk),
  });

  const handleSend = async () => {
    const result = await sendMessage({
      content: 'Hello!',
      model: 'gpt-4o-mini',
      includeHistory: true,
    });
  };

  return (
    <View>
      <Button onPress={handleSend} disabled={isLoading} title="Send" />
    </View>
  );
}
```
