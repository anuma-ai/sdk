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

| Function | Description |
| ------ | ------ |
| [BackupAuthProvider](functions/BackupAuthProvider.md) | Unified provider component for backup OAuth authentication. |
| [DropboxAuthProvider](functions/DropboxAuthProvider.md) | Provider component for Dropbox OAuth authentication. |
| [GoogleDriveAuthProvider](functions/GoogleDriveAuthProvider.md) | Provider component for Google Drive OAuth authentication. |
| [ICloudAuthProvider](functions/ICloudAuthProvider.md) | Provider component for iCloud authentication. |

## Encryption

| Function | Description |
| ------ | ------ |
| [decryptData](functions/decryptData.md) | Decrypts data using AES-GCM with the stored encryption key. |
| [encryptData](functions/encryptData.md) | Encrypts data using AES-GCM with the stored encryption key. |

## Hooks

| Function | Description |
| ------ | ------ |
| [useBackup](functions/useBackup.md) | Unified React hook for backup and restore functionality. |
| [useBackupAuth](functions/useBackupAuth.md) | Hook to access unified backup authentication state and methods. |
| [useChat](functions/useChat.md) | A React hook for managing chat completions with authentication. |
| [useChatStorage](functions/useChatStorage.md) | A React hook that wraps useChat with automatic message persistence using WatermelonDB. |
| [useDropboxAuth](functions/useDropboxAuth.md) | Hook to access Dropbox authentication state and methods. |
| [useDropboxBackup](functions/useDropboxBackup.md) | React hook for Dropbox backup and restore functionality. |
| [useEncryption](functions/useEncryption.md) | Hook that provides encryption key management for securing local data. |
| [useGoogleDriveAuth](functions/useGoogleDriveAuth.md) | Hook to access Google Drive authentication state and methods. |
| [useGoogleDriveBackup](functions/useGoogleDriveBackup.md) | React hook for Google Drive backup and restore functionality. |
| [useICloudAuth](functions/useICloudAuth.md) | Hook to access iCloud authentication state and methods. |
| [useICloudBackup](functions/useICloudBackup.md) | React hook for iCloud backup and restore functionality. |
| [useImageGeneration](functions/useImageGeneration.md) | React hook for generating images using the LLM API. |
| [useMemoryStorage](functions/useMemoryStorage.md) | A React hook that wraps useMemory with automatic memory persistence using WatermelonDB. |
| [useModels](functions/useModels.md) | React hook for fetching available LLM models. Automatically fetches all available models. |
| [useOCR](functions/useOCR.md) | React hook for extracting text from images using OCR. |
| [usePdf](functions/usePdf.md) | React hook for extracting text from PDF files. |
| [useSearch](functions/useSearch.md) | React hook for performing search operations using the AI SDK. |
| [useSettings](functions/useSettings.md) | A React hook for managing user settings with automatic persistence using WatermelonDB. |

## Other

### BACKUP\_DRIVE\_CONVERSATIONS\_FOLDER

Renames and re-exports [DEFAULT_DRIVE_CONVERSATIONS_FOLDER](variables/DEFAULT_DRIVE_CONVERSATIONS_FOLDER.md)

***

### BACKUP\_DRIVE\_ROOT\_FOLDER

Renames and re-exports [DEFAULT_DRIVE_ROOT_FOLDER](variables/DEFAULT_DRIVE_ROOT_FOLDER.md)

***

### BACKUP\_ICLOUD\_FOLDER

Renames and re-exports [DEFAULT_ICLOUD_BACKUP_FOLDER](variables/DEFAULT_ICLOUD_BACKUP_FOLDER.md)

***

### DEFAULT\_DROPBOX\_FOLDER

Renames and re-exports [DEFAULT_BACKUP_FOLDER](variables/DEFAULT_BACKUP_FOLDER.md)
