# Overview

The `@anuma/sdk/react` package provides a collection of React hooks
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
import { useChat } from "@anuma/sdk/react";

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
| [decryptDataBatch](Encryption/decryptDataBatch.md) | Batch decrypt multiple values efficiently with a single key lookup. Much faster than calling decryptData for each value individually. |
| [encryptData](Encryption/encryptData.md) | Encrypts data using AES-GCM with the stored encryption key. |
| [encryptDataBatch](Encryption/encryptDataBatch.md) | Batch encrypt multiple values efficiently with a single key lookup. Much faster than calling encryptData for each value individually. |

## Hooks

| Name | Description |
| ------ | ------ |
| [UseEncryptionResult](Hooks/UseEncryptionResult.md) | Result returned by the useEncryption hook. |
| [UseExportPdfResult](Hooks/UseExportPdfResult.md) | Result returned by the useExportPdf hook. |
| [UseOCRResult](Hooks/UseOCRResult.md) | Result returned by the useOCR hook. |
| [UsePdfResult](Hooks/UsePdfResult.md) | Result returned by the usePdf hook. |
| [UseVoiceOptions](Hooks/UseVoiceOptions.md) | Options for the useVoice hook. |
| [UseVoiceResult](Hooks/UseVoiceResult.md) | Result returned by the useVoice hook. |
| [useBackup](Hooks/useBackup.md) | Unified React hook for backup and restore functionality. |
| [useBackupAuth](Hooks/useBackupAuth.md) | Hook to access unified backup authentication state and methods. |
| [useChat](Hooks/useChat.md) | A React hook for managing chat completions with authentication. |
| [useChatStorage](Hooks/useChatStorage.md) | A React hook that wraps useChat with automatic message persistence using WatermelonDB. |
| [useCredits](Hooks/useCredits.md) | React hook for managing credits: checking balance, claiming daily credits, browsing packs, and purchasing credits. |
| [useDropboxAuth](Hooks/useDropboxAuth.md) | Hook to access Dropbox authentication state and methods. |
| [useDropboxBackup](Hooks/useDropboxBackup.md) | React hook for Dropbox backup and restore functionality. |
| [useEncryption](Hooks/useEncryption.md) | Hook that provides encryption key management for securing local data. |
| [useExportPdf](Hooks/useExportPdf.md) | React hook for exporting content as PDF. |
| [useFiles](Hooks/useFiles.md) | A React hook for managing files (images, videos, audio, documents). |
| [useGoogleDriveAuth](Hooks/useGoogleDriveAuth.md) | Hook to access Google Drive authentication state and methods. |
| [useGoogleDriveBackup](Hooks/useGoogleDriveBackup.md) | React hook for Google Drive backup and restore functionality. |
| [useICloudAuth](Hooks/useICloudAuth.md) | Hook to access iCloud authentication state and methods. |
| [useICloudBackup](Hooks/useICloudBackup.md) | React hook for iCloud backup and restore functionality. |
| [useModels](Hooks/useModels.md) | React hook for fetching available LLM models. Automatically fetches all available models. |
| [useOCR](Hooks/useOCR.md) | React hook for extracting text from images using OCR. |
| [usePdf](Hooks/usePdf.md) | React hook for extracting text from PDF files. |
| [usePhoneCalls](Hooks/usePhoneCalls.md) | React hook for phone calling: checking availability, creating calls, fetching their status, and polling for completion. |
| [useProjects](Hooks/useProjects.md) | A React hook for managing projects (conversation groups). |
| [useSettings](Hooks/useSettings.md) | A React hook for managing user settings with automatic persistence using WatermelonDB. |
| [useSubscription](Hooks/useSubscription.md) | React hook for managing subscription status and billing operations. Provides methods to check status, upgrade, manage billing, cancel, and renew subscriptions. |
| [useTools](Hooks/useTools.md) | React hook for fetching and caching server-side tools. |
| [useVoice](Hooks/useVoice.md) | React hook for recording voice and transcribing it on-device using Whisper. |

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

## PDF Export

| Name | Description |
| ------ | ------ |
| [PdfExportOptions](PDF-Export/PdfExportOptions.md) | Options for PDF export. |
| [PdfExportProgress](PDF-Export/PdfExportProgress.md) | Progress event emitted during PDF export. |
| [PdfExportStage](PDF-Export/PdfExportStage.md) | Stages of the PDF export pipeline. |
| [exportElementToPdf](PDF-Export/exportElementToPdf.md) | Capture a rendered HTML element as a high-fidelity PDF. |
| [exportMarkdownToPdf](PDF-Export/exportMarkdownToPdf.md) | Convert a markdown string to a PDF. No DOM required. |
| [renderElementToCanvas](PDF-Export/renderElementToCanvas.md) | Render a DOM element to a canvas using iframe isolation. |
