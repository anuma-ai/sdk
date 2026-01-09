# useGoogleDriveBackup()

> **useGoogleDriveBackup**(`options`: { `conversationsFolder?`: `string`; `database`: `Database`; `exportConversation`: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>; `importConversation`: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>; `requestEncryptionKey`: (`address`: `string`) => `Promise`<`void`>; `rootFolder?`: `string`; `userAddress`: `string` | `null`; }): [`UseGoogleDriveBackupResult`](../Internal/interfaces/UseGoogleDriveBackupResult.md)

Defined in: [src/react/useGoogleDriveBackup.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L105)

React hook for Google Drive backup and restore functionality.

This hook provides methods to backup conversations to Google Drive and restore them.
It handles all the logic for checking timestamps, skipping unchanged files,
authentication, and managing the backup/restore process.

Must be used within a GoogleDriveAuthProvider.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | { `conversationsFolder?`: `string`; `database`: `Database`; `exportConversation`: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>; `importConversation`: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>; `requestEncryptionKey`: (`address`: `string`) => `Promise`<`void`>; `rootFolder?`: `string`; `userAddress`: `string` | `null`; } | - |
| `options.conversationsFolder?` | `string` | Subfolder for conversations (default: 'conversations') |
| `options.database` | `Database` | WatermelonDB database instance |
| `options.exportConversation` | (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }> | Export a conversation to an encrypted blob |
| `options.importConversation` | (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }> | Import a conversation from an encrypted blob |
| `options.requestEncryptionKey` | (`address`: `string`) => `Promise`<`void`> | Request encryption key for the user address |
| `options.rootFolder?` | `string` | Root folder name in Google Drive (default: 'ai-chat-app') |
| `options.userAddress` | `string` | `null` | Current user address (null if not signed in) |

## Returns

[`UseGoogleDriveBackupResult`](../Internal/interfaces/UseGoogleDriveBackupResult.md)

## Example

```tsx
import { useGoogleDriveBackup } from "@reverbia/sdk/react";

function BackupButton() {
  const { backup, restore, isConfigured, isAuthenticated } = useGoogleDriveBackup({
    database,
    userAddress,
    requestEncryptionKey,
    exportConversation,
    importConversation,
  });

  const handleBackup = async () => {
    const result = await backup({
      onProgress: (current, total) => {
        console.log(`Progress: ${current}/${total}`);
      },
    });

    if ("error" in result) {
      console.error(result.error);
    } else {
      console.log(`Uploaded: ${result.uploaded}, Skipped: ${result.skipped}`);
    }
  };

  return <button onClick={handleBackup} disabled={!isConfigured}>Backup</button>;
}
```
