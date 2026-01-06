# Overview

React Native hooks for building AI-powered mobile applications.

The `@reverbia/sdk/expo` package provides React hooks optimized for
Expo and React Native environments. These hooks exclude web-only
dependencies (like pdfjs-dist) that aren't compatible with React Native.

## Installation & Setup

Before using this package, you must set up polyfills for React Native compatibility.
See the polyfills module documentation for complete setup instructions.

Quick setup summary:

```bash
pnpm install @reverbia/sdk@next web-streams-polyfill react-native-get-random-values @ethersproject/shims buffer
```

Then create an entrypoint file with all required polyfills. See
[ai-example-expo](https://github.com/zeta-chain/ai-example-expo) for a complete
working example.

## Differences from React Package

The Expo package is a lightweight subset of `@reverbia/sdk/react`:

- No PDF text extraction (pdfjs-dist is web-only)
- Uses XMLHttpRequest for streaming (fetch streaming isn't supported in RN)

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
import { useChat } from "@reverbia/sdk/expo";

function ChatScreen() {
  const { getIdentityToken } = useIdentityToken();

  const { isLoading, sendMessage, stop } = useChat({
    getToken: getIdentityToken,
    baseUrl: "https://ai-portal-dev.zetachain.com",
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
| [useChat](functions/useChat.md) | A React hook for managing chat completions with authentication. |
| [useChatStorage](functions/useChatStorage.md) | A React hook that wraps useChat with automatic message persistence using WatermelonDB. |
| [useMemoryStorage](functions/useMemoryStorage.md) | A React hook that wraps useMemory with automatic memory persistence using WatermelonDB. |

## Other

### ChatConversation

Re-exports [ChatConversation](../react/classes/ChatConversation.md)

***

### ChatMessage

Re-exports [ChatMessage](../react/classes/ChatMessage.md)

***

### ChatRole

Re-exports [ChatRole](../react/type-aliases/ChatRole.md)

***

### chatStorageMigrations

Re-exports [chatStorageMigrations](../react/variables/chatStorageMigrations.md)

***

### chatStorageSchema

Re-exports [chatStorageSchema](../react/variables/chatStorageSchema.md)

***

### CreateConversationOptions

Re-exports [CreateConversationOptions](../react/interfaces/CreateConversationOptions.md)

***

### CreateMemoryOptions

Re-exports [CreateMemoryOptions](../react/interfaces/CreateMemoryOptions.md)

***

### CreateMessageOptions

Re-exports [CreateMessageOptions](../react/interfaces/CreateMessageOptions.md)

***

### FileMetadata

Re-exports [FileMetadata](../react/interfaces/FileMetadata.md)

***

### generateCompositeKey

Re-exports [generateCompositeKey](../react/functions/generateCompositeKey.md)

***

### generateConversationId

Re-exports [generateConversationId](../react/functions/generateConversationId.md)

***

### generateUniqueKey

Re-exports [generateUniqueKey](../react/functions/generateUniqueKey.md)

***

### MemoryItem

Re-exports [MemoryItem](../react/interfaces/MemoryItem.md)

***

### memoryStorageSchema

Re-exports [memoryStorageSchema](../react/variables/memoryStorageSchema.md)

***

### MemoryType

Re-exports [MemoryType](../react/type-aliases/MemoryType.md)

***

### sdkMigrations

Re-exports [sdkMigrations](../react/variables/sdkMigrations.md)

***

### sdkModelClasses

Re-exports [sdkModelClasses](../react/variables/sdkModelClasses.md)

***

### sdkSchema

Re-exports [sdkSchema](../react/variables/sdkSchema.md)

***

### SearchSource

Re-exports [SearchSource](../react/interfaces/SearchSource.md)

***

### StoredChatCompletionUsage

Re-exports [StoredChatCompletionUsage](../react/interfaces/StoredChatCompletionUsage.md)

***

### StoredConversation

Re-exports [StoredConversation](../react/interfaces/StoredConversation.md)

***

### StoredMemory

Re-exports [StoredMemory](../react/interfaces/StoredMemory.md)

***

### StoredMemoryModel

Re-exports [StoredMemoryModel](../react/classes/StoredMemoryModel.md)

***

### StoredMemoryWithSimilarity

Re-exports [StoredMemoryWithSimilarity](../react/interfaces/StoredMemoryWithSimilarity.md)

***

### StoredMessage

Re-exports [StoredMessage](../react/interfaces/StoredMessage.md)

***

### StoredMessageWithSimilarity

Re-exports [StoredMessageWithSimilarity](../react/interfaces/StoredMessageWithSimilarity.md)

***

### UpdateMemoryOptions

Re-exports [UpdateMemoryOptions](../react/type-aliases/UpdateMemoryOptions.md)

***

### useImageGeneration

Re-exports [useImageGeneration](../react/functions/useImageGeneration.md)

***

### useModels

Re-exports [useModels](../react/functions/useModels.md)
