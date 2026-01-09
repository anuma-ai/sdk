# useChatStorage()

> **useChatStorage**(`options`: { `autoCreateConversation?`: `boolean`; `baseUrl?`: `string`; `conversationId?`: `string`; `database`: `Database`; `defaultConversationTitle?`: `string`; `getToken?`: () => `Promise`<`string` | `null`>; `onData?`: (`chunk`: `string`) => `void`; `onError?`: (`error`: `Error`) => `void`; `onFinish?`: (`response`: [`LlmapiResponseResponse`](../../client/type-aliases/LlmapiResponseResponse.md)) => `void`; }): [`UseChatStorageResult`](../interfaces/UseChatStorageResult.md)

Defined in: [src/expo/useChatStorage.ts:149](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useChatStorage.ts#L149)

A React hook that wraps useChat with automatic message persistence using WatermelonDB.

**Expo/React Native version** - This is a lightweight version that only supports
API-based chat completions. Local chat and client-side tools are not available.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | { `autoCreateConversation?`: `boolean`; `baseUrl?`: `string`; `conversationId?`: `string`; `database`: `Database`; `defaultConversationTitle?`: `string`; `getToken?`: () => `Promise`<`string` | `null`>; `onData?`: (`chunk`: `string`) => `void`; `onError?`: (`error`: `Error`) => `void`; `onFinish?`: (`response`: [`LlmapiResponseResponse`](../../client/type-aliases/LlmapiResponseResponse.md)) => `void`; } | Configuration options |
| `options.autoCreateConversation?` | `boolean` | - |
| `options.baseUrl?` | `string` | - |
| `options.conversationId?` | `string` | - |
| `options.database` | `Database` | - |
| `options.defaultConversationTitle?` | `string` | - |
| `options.getToken?` | () => `Promise`<`string` | `null`> | - |
| `options.onData?` | (`chunk`: `string`) => `void` | - |
| `options.onError?` | (`error`: `Error`) => `void` | - |
| `options.onFinish?` | (`response`: [`LlmapiResponseResponse`](../../client/type-aliases/LlmapiResponseResponse.md)) => `void` | - |

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
