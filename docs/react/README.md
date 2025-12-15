# Overview

The `@reverbia/sdk/react` package provides a collection of React hooks
designed to simplify building AI features in your applications. These hooks
abstract away the complexity of managing streaming responses, loading states,
authentication, and real-time updates, letting you focus on creating great
user experiences.

## Why Use These Hooks?

Building AI-powered interfaces involves handling many concerns: streaming
responses token-by-token, managing conversation state, coordinating tool
execution, processing file attachments, and more. These hooks provide
production-ready abstractions that handle these complexities out of the box.

**Key benefits:**

- **Streaming-first**: Built-in support for real-time streaming with
  automatic UI updates as content arrives
- **State management**: Automatic handling of loading states, errors, and
  request lifecycle
- **Flexible providers**: Choose between API-based inference or local
  in-browser models for privacy-sensitive use cases
- **Client-side tools**: Execute tools directly in the browser with automatic
  context injection into LLM responses
- **File processing**: Extract text from PDFs and images (OCR) to provide
  document context to your AI
- **Memory & context**: Extract and retrieve relevant memories using semantic
  search to make your AI context-aware
- **Wallet-based encryption**: Secure data encryption using wallet signatures
  for Web3 applications

## Quick Start

```tsx
import { useChat } from "@reverbia/sdk/react";

function ChatComponent() {
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
    <div>
      <button onClick={handleSend} disabled={isLoading}>Send</button>
      {isLoading && <button onClick={stop}>Stop</button>}
    </div>
  );
}
```

## Hooks

- [useChat](functions/useChat.md)
- [useChatStorage](functions/useChatStorage.md)
- [useEncryption](functions/useEncryption.md)
- [useImageGeneration](functions/useImageGeneration.md)
- [useMemoryStorage](functions/useMemoryStorage.md)
- [useModels](functions/useModels.md)
- [useOCR](functions/useOCR.md)
- [usePdf](functions/usePdf.md)
- [useSearch](functions/useSearch.md)

## Other

- [ChatConversation](classes/ChatConversation.md)
- [ChatMessage](classes/ChatMessage.md)
- [StoredMemoryModel](classes/StoredMemoryModel.md)
- [ClientTool](interfaces/ClientTool.md)
- [CreateConversationOptions](interfaces/CreateConversationOptions.md)
- [CreateMemoryOptions](interfaces/CreateMemoryOptions.md)
- [CreateMessageOptions](interfaces/CreateMessageOptions.md)
- [FileMetadata](interfaces/FileMetadata.md)
- [MemoryItem](interfaces/MemoryItem.md)
- [OCRFile](interfaces/OCRFile.md)
- [PdfFile](interfaces/PdfFile.md)
- [SearchMessagesOptions](interfaces/SearchMessagesOptions.md)
- [SearchSource](interfaces/SearchSource.md)
- [SendMessageWithStorageArgs](interfaces/SendMessageWithStorageArgs.md)
- [StoredChatCompletionUsage](interfaces/StoredChatCompletionUsage.md)
- [StoredConversation](interfaces/StoredConversation.md)
- [StoredMemory](interfaces/StoredMemory.md)
- [StoredMemoryWithSimilarity](interfaces/StoredMemoryWithSimilarity.md)
- [StoredMessage](interfaces/StoredMessage.md)
- [StoredMessageWithSimilarity](interfaces/StoredMessageWithSimilarity.md)
- [ToolExecutionResult](interfaces/ToolExecutionResult.md)
- [ToolParameter](interfaces/ToolParameter.md)
- [ToolSelectionResult](interfaces/ToolSelectionResult.md)
- [UpdateMemoryOptions](interfaces/UpdateMemoryOptions.md)
- [UseChatStorageOptions](interfaces/UseChatStorageOptions.md)
- [UseChatStorageResult](interfaces/UseChatStorageResult.md)
- [ChatRole](type-aliases/ChatRole.md)
- [MemoryType](type-aliases/MemoryType.md)
- [SendMessageWithStorageResult](type-aliases/SendMessageWithStorageResult.md)
- [SignMessageFn](type-aliases/SignMessageFn.md)
- [UseMemoryStorageOptions](type-aliases/UseMemoryStorageOptions.md)
- [UseMemoryStorageResult](type-aliases/UseMemoryStorageResult.md)
- [chatStorageSchema](variables/chatStorageSchema.md)
- [DEFAULT\_TOOL\_SELECTOR\_MODEL](variables/DEFAULT_TOOL_SELECTOR_MODEL.md)
- [memoryStorageSchema](variables/memoryStorageSchema.md)
- [createMemoryContextSystemMessage](functions/createMemoryContextSystemMessage.md)
- [decryptData](functions/decryptData.md)
- [decryptDataBytes](functions/decryptDataBytes.md)
- [encryptData](functions/encryptData.md)
- [executeTool](functions/executeTool.md)
- [extractConversationContext](functions/extractConversationContext.md)
- [formatMemoriesForChat](functions/formatMemoriesForChat.md)
- [generateCompositeKey](functions/generateCompositeKey.md)
- [generateConversationId](functions/generateConversationId.md)
- [generateUniqueKey](functions/generateUniqueKey.md)
- [hasEncryptionKey](functions/hasEncryptionKey.md)
- [requestEncryptionKey](functions/requestEncryptionKey.md)
- [selectTool](functions/selectTool.md)
