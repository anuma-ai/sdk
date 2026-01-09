# useDropboxBackup

> **useDropboxBackup**(`options`: { `backupFolder?`: `string`; `database`: `Database`; `exportConversation`: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>; `importConversation`: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>; `requestEncryptionKey`: (`address`: `string`) => `Promise`<`void`>; `userAddress`: `string` | `null`; }): [`UseDropboxBackupResult`](../Internal/interfaces/UseDropboxBackupResult.md)

Defined in: [src/react/useDropboxBackup.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L102)

React hook for Dropbox backup and restore functionality.

This hook provides methods to backup conversations to Dropbox and restore them.
It handles all the logic for checking timestamps, skipping unchanged files,
authentication, and managing the backup/restore process.

Must be used within a DropboxAuthProvider.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | { `backupFolder?`: `string`; `database`: `Database`; `exportConversation`: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>; `importConversation`: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>; `requestEncryptionKey`: (`address`: `string`) => `Promise`<`void`>; `userAddress`: `string` | `null`; } | - |
| `options.backupFolder?` | `string` | Dropbox folder path for backups (default: '/ai-chat-app/conversations') |
| `options.database` | `Database` | WatermelonDB database instance |
| `options.exportConversation` | (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }> | Export a conversation to an encrypted blob |
| `options.importConversation` | (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }> | Import a conversation from an encrypted blob |
| `options.requestEncryptionKey` | (`address`: `string`) => `Promise`<`void`> | Request encryption key for the user address |
| `options.userAddress` | `string` | `null` | Current user address (null if not signed in) |

## Returns

[`UseDropboxBackupResult`](../Internal/interfaces/UseDropboxBackupResult.md)

## Example

```tsx
import { useDropboxBackup } from "@reverbia/sdk/react";

function BackupButton() {
  const { backup, restore, isConfigured } = useDropboxBackup({
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
