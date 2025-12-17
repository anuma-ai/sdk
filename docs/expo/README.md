# Overview

React Native hooks for building AI-powered mobile applications.

The `@reverbia/sdk/expo` package provides React hooks optimized for
Expo and React Native environments. These hooks exclude web-only
dependencies (like pdfjs-dist and @huggingface/transformers) that
aren't compatible with React Native.

## Differences from React Package

The Expo package is a lightweight subset of `@reverbia/sdk/react`:

- No local/in-browser AI models (requires web APIs)
- No PDF text extraction (pdfjs-dist is web-only)
- No OCR/image text extraction (transformers.js is web-only)
- No client-side tool execution
- Uses XMLHttpRequest for streaming (fetch streaming isn't supported in RN)

## Quick Start

```tsx
import { useChat } from "@reverbia/sdk/expo";

function ChatScreen() {
  const { isLoading, sendMessage, stop } = useChat({
    getToken: async () => getAuthToken(),
    onData: (chunk) => setResponse((prev) => prev + chunk),
  });

  const handleSend = async () => {
    await sendMessage({
      messages: [{ role: "user", content: [{ type: "text", text: input }] }],
      model: "gpt-4o-mini",
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

- [useChat](functions/useChat.md)
- [useChatStorage](functions/useChatStorage.md)
- [useMemoryStorage](functions/useMemoryStorage.md)

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
