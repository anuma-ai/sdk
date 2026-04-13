# useChatStorage

> **useChatStorage**(`options`: `object`): [`UseChatStorageResult`](../Internal/interfaces/UseChatStorageResult.md)

Defined in: [src/expo/useChatStorage.ts:350](https://github.com/anuma-ai/sdk/blob/main/src/expo/useChatStorage.ts#350)

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

`options.apiType?`

</td>
<td>

`ApiType`

</td>
<td>

Which API endpoint to use. Default: "responses"

* "responses": OpenAI Responses API (supports thinking, reasoning, conversations)
* "completions": OpenAI Chat Completions API (wider model compatibility)

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

`options.autoEmbedMessages?`

</td>
<td>

`boolean`

</td>
<td>

Automatically generate embeddings for messages after saving.
Enables semantic search over past conversations via searchMessages().

**Default**

```ts
true
```

</td>
</tr>
<tr>
<td>

`options.autoFlushOnKeyAvailable?`

</td>
<td>

`boolean`

</td>
<td>

Auto-flush queued operations when key becomes available.

**Default**

```ts
true
```

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

`options.embeddedWalletSigner?`

</td>
<td>

[`EmbeddedWalletSignerFn`](../../react/Internal/type-aliases/EmbeddedWalletSignerFn.md)

</td>
<td>

Function for silent signing with Privy embedded wallets.

</td>
</tr>
<tr>
<td>

`options.embeddingModel?`

</td>
<td>

`string`

</td>
<td>

Embedding model to use when autoEmbedMessages is enabled.

**Default**

```ts
DEFAULT_API_EMBEDDING_MODEL
```

</td>
</tr>
<tr>
<td>

`options.enableQueue?`

</td>
<td>

`boolean`

</td>
<td>

Enable the in-memory write queue.

**Default**

```ts
true
```

</td>
</tr>
<tr>
<td>

`options.fileProcessingOptions?`

</td>
<td>

{ `keepOriginalFiles?`: `boolean`; `maxFileSizeBytes?`: `number`; `onError?`: (`fileName`: `string`, `error`: `Error`) => `void`; `onProgress?`: (`current`: `number`, `total`: `number`, `fileName`: `string`) => `void`; }

</td>
<td>

Options for file preprocessing behavior

</td>
</tr>
<tr>
<td>

`options.fileProcessingOptions.keepOriginalFiles?`

</td>
<td>

`boolean`

</td>
<td>

Whether to keep original file attachments (default: true)

</td>
</tr>
<tr>
<td>

`options.fileProcessingOptions.maxFileSizeBytes?`

</td>
<td>

`number`

</td>
<td>

Max file size to process in bytes (default: 10MB)

</td>
</tr>
<tr>
<td>

`options.fileProcessingOptions.onError?`

</td>
<td>

(`fileName`: `string`, `error`: `Error`) => `void`

</td>
<td>

Callback for errors (non-fatal)

</td>
</tr>
<tr>
<td>

`options.fileProcessingOptions.onProgress?`

</td>
<td>

(`current`: `number`, `total`: `number`, `fileName`: `string`) => `void`

</td>
<td>

Callback for progress updates

</td>
</tr>
<tr>
<td>

`options.fileProcessors?`

</td>
<td>

[`FileProcessor`](../../react/Internal/interfaces/FileProcessor.md)\[] | `null`

</td>
<td>

File preprocessors to use for automatic text extraction.

* undefined (default): Use all built-in processors (PDF, Excel, Word)
* null or \[]: Disable preprocessing
* FileProcessor\[]: Use specific processors

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

`options.getWalletAddress?`

</td>
<td>

() => `Promise`<`string` | `null`>

</td>
<td>

Async function to poll for wallet address during Privy initialization.

</td>
</tr>
<tr>
<td>

`options.mcpR2Domain?`

</td>
<td>

`string`

</td>
<td>

R2 domain for identifying MCP-generated image URLs.
When set, enables OPFS caching of generated images.
Defaults to the hardcoded MCP\_R2\_DOMAIN from clientConfig.

</td>
</tr>
<tr>
<td>

`options.minContentLength?`

</td>
<td>

`number`

</td>
<td>

Minimum content length required to generate embeddings.
Messages shorter than this are skipped as they provide limited semantic value.

**Default**

```ts
10
```

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
<tr>
<td>

`options.onServerToolCall?`

</td>
<td>

(`toolCall`: `ServerToolCallEvent`) => `void`

</td>
<td>

Callback invoked when a server-side tool (MCP) is called during streaming.
Use this to show activity indicators like "Searching..." in the UI.

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

Callback invoked when thinking/reasoning content is received (from `<think>` tags or API reasoning)

</td>
</tr>
<tr>
<td>

`options.onToolCallArgumentsDelta?`

</td>
<td>

(`event`: [`ToolCallArgumentsDeltaEvent`](../../react/Internal/type-aliases/ToolCallArgumentsDeltaEvent.md)) => `void`

</td>
<td>

Called with partial tool call arguments as they stream in.
Use for live preview of artifacts (HTML, slides) being generated.

</td>
</tr>
<tr>
<td>

`options.serverTools?`

</td>
<td>

{ `cacheExpirationMs?`: `number`; }

</td>
<td>

Configuration for server-side tools fetching and caching.
Server tools are fetched from /api/v1/tools and cached in localStorage.

</td>
</tr>
<tr>
<td>

`options.serverTools.cacheExpirationMs?`

</td>
<td>

`number`

</td>
<td>

Cache expiration time in milliseconds (default: 86400000 = 1 day)

</td>
</tr>
<tr>
<td>

`options.signMessage?`

</td>
<td>

[`SignMessageFn`](../../react/Internal/type-aliases/SignMessageFn.md)

</td>
<td>

Function to sign a message for encryption key derivation.

</td>
</tr>
<tr>
<td>

`options.walletAddress?`

</td>
<td>

`string`

</td>
<td>

Wallet address for field-level encryption.
When provided with signMessage, all sensitive content is encrypted at rest.

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
import { useChatStorage } from '@anuma/sdk/expo';

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
      model: 'fireworks/accounts/fireworks/models/kimi-k2p5',
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
