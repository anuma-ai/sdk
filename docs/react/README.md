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

## Components

- [BackupAuthProvider](functions/BackupAuthProvider.md)
- [DropboxAuthProvider](functions/DropboxAuthProvider.md)
- [GoogleDriveAuthProvider](functions/GoogleDriveAuthProvider.md)

## Hooks

- [useBackup](functions/useBackup.md)
- [useBackupAuth](functions/useBackupAuth.md)
- [useChat](functions/useChat.md)
- [useChatStorage](functions/useChatStorage.md)
- [useDropboxAuth](functions/useDropboxAuth.md)
- [useDropboxBackup](functions/useDropboxBackup.md)
- [useEncryption](functions/useEncryption.md)
- [useGoogleDriveAuth](functions/useGoogleDriveAuth.md)
- [useGoogleDriveBackup](functions/useGoogleDriveBackup.md)
- [useImageGeneration](functions/useImageGeneration.md)
- [useMemoryStorage](functions/useMemoryStorage.md)
- [useModels](functions/useModels.md)
- [useOCR](functions/useOCR.md)
- [usePdf](functions/usePdf.md)
- [useSearch](functions/useSearch.md)
- [useSettings](functions/useSettings.md)

## Other

### BACKUP\_DRIVE\_CONVERSATIONS\_FOLDER

Renames and re-exports [DEFAULT_DRIVE_CONVERSATIONS_FOLDER](variables/DEFAULT_DRIVE_CONVERSATIONS_FOLDER.md)

***

### BACKUP\_DRIVE\_ROOT\_FOLDER

Renames and re-exports [DEFAULT_DRIVE_ROOT_FOLDER](variables/DEFAULT_DRIVE_ROOT_FOLDER.md)

***

### DEFAULT\_DROPBOX\_FOLDER

Renames and re-exports [DEFAULT_BACKUP_FOLDER](variables/DEFAULT_BACKUP_FOLDER.md)
