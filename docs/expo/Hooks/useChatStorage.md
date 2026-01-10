# useChatStorage

> **useChatStorage**(`options`: `object`): [`UseChatStorageResult`](../Internal/interfaces/UseChatStorageResult.md)

Defined in: src/expo/useChatStorage.ts:152

A React hook that wraps useChat with automatic message persistence using WatermelonDB.

**Expo/React Native version** - This is a lightweight version that only supports
API-based chat completions. Local chat and client-side tools are not available.

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

`options`

</td>
<td>

`object`

</td>
<td>

Configuration options

</td>
</tr>
<tr>
<td>

`options.autoCreateConversation?`

</td>
<td>

`boolean`

</td>
<td>

Automatically create a new conversation if none is set (default: true)

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

Base URL for the chat API endpoint

</td>
</tr>
<tr>
<td>

`options.conversationId?`

</td>
<td>

`string`

</td>
<td>

ID of an existing conversation to load and continue

</td>
</tr>
<tr>
<td>

`options.database`

</td>
<td>

`Database`

</td>
<td>

WatermelonDB database instance for storing conversations and messages

</td>
</tr>
<tr>
<td>

`options.defaultConversationTitle?`

</td>
<td>

`string`

</td>
<td>

Title for auto-created conversations (default: "New conversation")

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

Function to retrieve the auth token for API requests

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

Callback invoked with each streamed response chunk

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

Callback invoked when an error occurs during the request

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

Callback invoked when the response completes successfully

</td>
</tr>
</tbody>
</table>

## Returns

[`UseChatStorageResult`](../Internal/interfaces/UseChatStorageResult.md)

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
