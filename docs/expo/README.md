# Overview

React Native hooks for building AI-powered mobile applications.

The `@anuma/sdk/expo` package provides React hooks optimized for
Expo and React Native environments. These hooks exclude web-only
dependencies (like pdfjs-dist) that aren't compatible with React Native.

## Installation & Setup

Before using this package, you must set up polyfills for React Native compatibility.
See the polyfills module documentation for complete setup instructions.

Quick setup summary:

```bash
pnpm install @anuma/sdk@next web-streams-polyfill react-native-get-random-values @ethersproject/shims buffer
```

Then create an entrypoint file with all required polyfills. See
[ai-example-expo](https://github.com/zeta-chain/ai-example-expo) for a complete
working example.

## Differences from React Package

The Expo package is a lightweight subset of `@anuma/sdk/react`:

* No PDF text extraction (pdfjs-dist is web-only)
* Uses XMLHttpRequest for streaming (fetch streaming isn't supported in RN)

## Authentication

Use `@privy-io/expo` for authentication in React Native:

```typescript
import { PrivyProvider, usePrivy } from "@privy-io/expo";
import { useIdentityToken } from "@privy-io/expo";

// Wrap your app with PrivyProvider
<PrivyProvider appId="your-app-id" clientId="your-client-id">
  <App />
</PrivyProvider>;

// Get identity token for API calls
const { getIdentityToken } = useIdentityToken();
```

## Quick Start

```tsx
import { useIdentityToken } from "@privy-io/expo";
import { useChat } from "@anuma/sdk/expo";

function ChatScreen() {
  const { getIdentityToken } = useIdentityToken();

  const { isLoading, sendMessage, stop } = useChat({
    getToken: getIdentityToken,
    baseUrl: "https://portal.anuma-dev.ai",
    onData: (chunk) => {
      // Handle streaming chunks
      const content =
        typeof chunk === "string"
          ? chunk
          : chunk.choices?.[0]?.delta?.content || "";
      console.log("Received:", content);
    },
    onFinish: () => console.log("Stream finished"),
    onError: (error) => console.error("Error:", error),
  });

  const handleSend = async () => {
    await sendMessage({
      messages: [{ role: "user", content: [{ type: "text", text: "Hello!" }] }],
      model: "openai/gpt-4o",
    });
  };

  return (
    <View>
      <Button onPress={handleSend} disabled={isLoading} title="Send" />
      {isLoading && <Button onPress={stop} title="Stop" />}
    </View>
  );
}
```

## Hooks

| Function | Description |
| ------ | ------ |
| [useChat](Hooks/useChat.md) | A React hook for managing chat completions with authentication. |
| [useChatStorage](Hooks/useChatStorage.md) | A React hook that wraps useChat with automatic message persistence using WatermelonDB. |

## Other

### CachedServerTools

Re-exports [CachedServerTools](../react/Internal/interfaces/CachedServerTools.md)

***

### ChatConversation

Re-exports [ChatConversation](../react/Internal/classes/ChatConversation.md)

***

### ChatMessage

Re-exports [ChatMessage](../react/Internal/classes/ChatMessage.md)

***

### ChatRole

Re-exports [ChatRole](../react/Internal/type-aliases/ChatRole.md)

***

### chatStorageMigrations

Re-exports [chatStorageMigrations](../react/Internal/variables/chatStorageMigrations.md)

***

### chatStorageSchema

Re-exports [chatStorageSchema](../react/Internal/variables/chatStorageSchema.md)

***

### clearAllEncryptionKeys

Re-exports [clearAllEncryptionKeys](../react/Internal/functions/clearAllEncryptionKeys.md)

***

### clearEncryptionKey

Re-exports [clearEncryptionKey](../react/Internal/functions/clearEncryptionKey.md)

***

### clearServerToolsCache

Re-exports [clearServerToolsCache](../react/Internal/functions/clearServerToolsCache.md)

***

### CreateConversationOptions

Re-exports [CreateConversationOptions](../react/Internal/interfaces/CreateConversationOptions.md)

***

### createMemoryRetrievalTool

Re-exports [createMemoryRetrievalTool](../react/Internal/functions/createMemoryRetrievalTool.md)

***

### createMemoryVaultTool

Re-exports [createMemoryVaultTool](../react/Internal/functions/createMemoryVaultTool.md)

***

### CreateMessageOptions

Re-exports [CreateMessageOptions](../react/Internal/interfaces/CreateMessageOptions.md)

***

### createVaultMemoryOp

Re-exports [createVaultMemoryOp](../react/Internal/functions/createVaultMemoryOp.md)

***

### CreateVaultMemoryOptions

Re-exports [CreateVaultMemoryOptions](../react/Internal/interfaces/CreateVaultMemoryOptions.md)

***

### DatabaseManager

Re-exports [DatabaseManager](../react/Internal/classes/DatabaseManager.md)

***

### DatabaseManagerLogger

Re-exports [DatabaseManagerLogger](../react/Internal/interfaces/DatabaseManagerLogger.md)

***

### DatabaseManagerOptions

Re-exports [DatabaseManagerOptions](../react/Internal/interfaces/DatabaseManagerOptions.md)

***

### DEFAULT\_CACHE\_EXPIRATION\_MS

Re-exports [DEFAULT\_CACHE\_EXPIRATION\_MS](../react/Internal/variables/DEFAULT_CACHE_EXPIRATION_MS.md)

***

### deleteVaultMemoryOp

Re-exports [deleteVaultMemoryOp](../react/Internal/functions/deleteVaultMemoryOp.md)

***

### embedAllMessages

Re-exports [embedAllMessages](../react/Internal/functions/embedAllMessages.md)

***

### EmbeddedWalletSignerFn

Re-exports [EmbeddedWalletSignerFn](../react/Internal/type-aliases/EmbeddedWalletSignerFn.md)

***

### embedMessage

Re-exports [embedMessage](../react/Internal/functions/embedMessage.md)

***

### FileMetadata

Re-exports [FileMetadata](../react/Internal/interfaces/FileMetadata.md)

***

### FlushResult

Re-exports [FlushResult](../react/Internal/interfaces/FlushResult.md)

***

### generateConversationId

Re-exports [generateConversationId](../react/Internal/functions/generateConversationId.md)

***

### generateEmbedding

Re-exports [generateEmbedding](../react/Internal/functions/generateEmbedding.md)

***

### generateEmbeddings

Re-exports [generateEmbeddings](../react/Internal/functions/generateEmbeddings.md)

***

### getAllVaultMemoriesOp

Re-exports [getAllVaultMemoriesOp](../react/Internal/functions/getAllVaultMemoriesOp.md)

***

### getCachedServerTools

Re-exports [getCachedServerTools](../react/Internal/functions/getCachedServerTools.md)

***

### getServerTools

Re-exports [getServerTools](../react/Internal/functions/getServerTools.md)

***

### getVaultMemoryOp

Re-exports [getVaultMemoryOp](../react/Internal/functions/getVaultMemoryOp.md)

***

### hasEncryptionKey

Re-exports [hasEncryptionKey](../react/Internal/functions/hasEncryptionKey.md)

***

### MemoryRetrievalEmbeddingOptions

Re-exports [MemoryRetrievalEmbeddingOptions](../react/Internal/interfaces/MemoryRetrievalEmbeddingOptions.md)

***

### MemoryRetrievalResult

Re-exports [MemoryRetrievalResult](../react/Internal/interfaces/MemoryRetrievalResult.md)

***

### MemoryRetrievalSearchOptions

Re-exports [MemoryRetrievalSearchOptions](../react/Internal/interfaces/MemoryRetrievalSearchOptions.md)

***

### MemoryVaultToolOptions

Re-exports [MemoryVaultToolOptions](../react/Internal/interfaces/MemoryVaultToolOptions.md)

***

### onKeyAvailable

Re-exports [onKeyAvailable](../react/Internal/functions/onKeyAvailable.md)

***

### PlatformStorage

Re-exports [PlatformStorage](../react/Internal/interfaces/PlatformStorage.md)

***

### queueManager

Re-exports [queueManager](../react/Internal/variables/queueManager.md)

***

### QueueManager

Re-exports [QueueManager](../react/Internal/classes/QueueManager.md)

***

### QueueStatus

Re-exports [QueueStatus](../react/Internal/interfaces/QueueStatus.md)

***

### requestEncryptionKey

Re-exports [requestEncryptionKey](../react/Internal/functions/requestEncryptionKey.md)

***

### SDK\_SCHEMA\_VERSION

Re-exports [SDK\_SCHEMA\_VERSION](../react/Internal/variables/SDK_SCHEMA_VERSION.md)

***

### sdkMigrations

Re-exports [sdkMigrations](../react/Internal/variables/sdkMigrations.md)

***

### sdkModelClasses

Re-exports [sdkModelClasses](../react/Internal/variables/sdkModelClasses.md)

***

### sdkSchema

Re-exports [sdkSchema](../react/Internal/variables/sdkSchema.md)

***

### SearchSource

Re-exports [SearchSource](../react/Internal/interfaces/SearchSource.md)

***

### ServerToolsOptions

Re-exports [ServerToolsOptions](../react/Internal/interfaces/ServerToolsOptions.md)

***

### ServerToolsResponse

Re-exports [ServerToolsResponse](../react/Internal/type-aliases/ServerToolsResponse.md)

***

### SignMessageFn

Re-exports [SignMessageFn](../react/Internal/type-aliases/SignMessageFn.md)

***

### StoredChatCompletionUsage

Re-exports [StoredChatCompletionUsage](../react/Internal/interfaces/StoredChatCompletionUsage.md)

***

### StoredConversation

Re-exports [StoredConversation](../react/Internal/interfaces/StoredConversation.md)

***

### StoredMessage

Re-exports [StoredMessage](../react/Internal/interfaces/StoredMessage.md)

***

### StoredMessageWithSimilarity

Re-exports [StoredMessageWithSimilarity](../react/Internal/interfaces/StoredMessageWithSimilarity.md)

***

### StoredVaultMemory

Re-exports [StoredVaultMemory](../react/Internal/interfaces/StoredVaultMemory.md)

***

### StoredVaultMemoryModel

Re-exports [StoredVaultMemoryModel](../react/Internal/classes/StoredVaultMemoryModel.md)

***

### updateVaultMemoryOp

Re-exports [updateVaultMemoryOp](../react/Internal/functions/updateVaultMemoryOp.md)

***

### UpdateVaultMemoryOptions

Re-exports [UpdateVaultMemoryOptions](../react/Internal/interfaces/UpdateVaultMemoryOptions.md)

***

### useCredits

Re-exports [useCredits](../react/Hooks/useCredits.md)

***

### UseCreditsOptions

Re-exports [UseCreditsOptions](../react/Internal/type-aliases/UseCreditsOptions.md)

***

### UseCreditsResult

Re-exports [UseCreditsResult](../react/Internal/type-aliases/UseCreditsResult.md)

***

### useEncryption

Re-exports [useEncryption](../react/Hooks/useEncryption.md)

***

### useModels

Re-exports [useModels](../react/Hooks/useModels.md)

***

### UseModelsResult

Re-exports [UseModelsResult](../react/Internal/type-aliases/UseModelsResult.md)

***

### VaultMemoryOperationsContext

Re-exports [VaultMemoryOperationsContext](../react/Internal/interfaces/VaultMemoryOperationsContext.md)

***

### VaultSaveOperation

Re-exports [VaultSaveOperation](../react/Internal/interfaces/VaultSaveOperation.md)

***

### WalletPoller

Re-exports [WalletPoller](../react/Internal/classes/WalletPoller.md)
