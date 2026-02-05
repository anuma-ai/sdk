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

* **Streaming-first**: Built-in support for real-time streaming with
  automatic UI updates as content arrives
* **State management**: Automatic handling of loading states, errors, and
  request lifecycle
* **File processing**: Extract text from PDFs and images (OCR) to provide
  document context to your AI
* **Memory & context**: Extract and retrieve relevant memories using semantic
  search to make your AI context-aware
* **Wallet-based encryption**: Secure data encryption using wallet signatures
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

## Encryption

| Function | Description |
| ------ | ------ |
| [decryptData](Encryption/decryptData.md) | Decrypts data using AES-GCM with the stored encryption key. |
| [encryptData](Encryption/encryptData.md) | Encrypts data using AES-GCM with the stored encryption key. |

## Hooks

| Name | Description |
| ------ | ------ |
| [UseEncryptionResult](Hooks/UseEncryptionResult.md) | Result returned by the useEncryption hook. |
| [UseOCRResult](Hooks/UseOCRResult.md) | Result returned by the useOCR hook. |
| [UsePdfResult](Hooks/UsePdfResult.md) | Result returned by the usePdf hook. |
| [useBackup](Hooks/useBackup.md) | Unified React hook for backup and restore functionality. |
| [useBackupAuth](Hooks/useBackupAuth.md) | Hook to access unified backup authentication state and methods. |
| [useChat](Hooks/useChat.md) | A React hook for managing chat completions with authentication. |
| [useDropboxAuth](Hooks/useDropboxAuth.md) | Hook to access Dropbox authentication state and methods. |
| [useDropboxBackup](Hooks/useDropboxBackup.md) | React hook for Dropbox backup and restore functionality. |
| [useEncryption](Hooks/useEncryption.md) | Hook that provides encryption key management for securing local data. |
| [useFiles](Hooks/useFiles.md) | A React hook for managing files (images, videos, audio, documents). |
| [useGoogleDriveAuth](Hooks/useGoogleDriveAuth.md) | Hook to access Google Drive authentication state and methods. |
| [useGoogleDriveBackup](Hooks/useGoogleDriveBackup.md) | React hook for Google Drive backup and restore functionality. |
| [useICloudAuth](Hooks/useICloudAuth.md) | Hook to access iCloud authentication state and methods. |
| [useICloudBackup](Hooks/useICloudBackup.md) | React hook for iCloud backup and restore functionality. |
| [useMemoryStorage](Hooks/useMemoryStorage.md) | A React hook that wraps useMemory with automatic memory persistence using WatermelonDB. |
| [useModels](Hooks/useModels.md) | React hook for fetching available LLM models. Automatically fetches all available models. |
| [useOCR](Hooks/useOCR.md) | React hook for extracting text from images using OCR. |
| [usePdf](Hooks/usePdf.md) | React hook for extracting text from PDF files. |
| [useProjects](Hooks/useProjects.md) | A React hook for managing projects (conversation groups). |
| [useSettings](Hooks/useSettings.md) | A React hook for managing user settings with automatic persistence using WatermelonDB. |
| [useSubscription](Hooks/useSubscription.md) | React hook for managing subscription status and billing operations. Provides methods to check status, upgrade, manage billing, cancel, and renew subscriptions. |
| [useTools](Hooks/useTools.md) | React hook for fetching and caching server-side tools. |

## Other

### BACKUP\_DRIVE\_CONVERSATIONS\_FOLDER

Renames and re-exports [DEFAULT\_DRIVE\_CONVERSATIONS\_FOLDER](Internal/variables/DEFAULT_DRIVE_CONVERSATIONS_FOLDER.md)

***

### BACKUP\_DRIVE\_ROOT\_FOLDER

Renames and re-exports [DEFAULT\_DRIVE\_ROOT\_FOLDER](Internal/variables/DEFAULT_DRIVE_ROOT_FOLDER.md)

***

### BACKUP\_ICLOUD\_FOLDER

Renames and re-exports [DEFAULT\_ICLOUD\_BACKUP\_FOLDER](Internal/variables/DEFAULT_ICLOUD_BACKUP_FOLDER.md)

***

### DEFAULT\_DROPBOX\_FOLDER

Renames and re-exports [DEFAULT\_BACKUP\_FOLDER](Internal/variables/DEFAULT_BACKUP_FOLDER.md)
