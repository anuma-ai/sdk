# useICloudBackup()

> **useICloudBackup**(`options`: { `database`: `Database`; `exportConversation`: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>; `importConversation`: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>; `requestEncryptionKey`: (`address`: `string`) => `Promise`<`void`>; `userAddress`: `string` | `null`; }): [`UseICloudBackupResult`](../Internal/interfaces/UseICloudBackupResult.md)

Defined in: [src/react/useICloudBackup.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L106)

React hook for iCloud backup and restore functionality.

This hook provides methods to backup conversations to iCloud and restore them.
It handles all the logic for checking timestamps, skipping unchanged files,
authentication, and managing the backup/restore process.

Must be used within an ICloudAuthProvider.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | { `database`: `Database`; `exportConversation`: (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }>; `importConversation`: (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }>; `requestEncryptionKey`: (`address`: `string`) => `Promise`<`void`>; `userAddress`: `string` | `null`; } | - |
| `options.database` | `Database` | WatermelonDB database instance |
| `options.exportConversation` | (`conversationId`: `string`, `userAddress`: `string`) => `Promise`<{ `blob?`: `Blob`; `success`: `boolean`; }> | Export a conversation to an encrypted blob |
| `options.importConversation` | (`blob`: `Blob`, `userAddress`: `string`) => `Promise`<{ `success`: `boolean`; }> | Import a conversation from an encrypted blob |
| `options.requestEncryptionKey` | (`address`: `string`) => `Promise`<`void`> | Request encryption key for the user address |
| `options.userAddress` | `string` | `null` | Current user address (null if not signed in) |

## Returns

[`UseICloudBackupResult`](../Internal/interfaces/UseICloudBackupResult.md)

## Example

```tsx
import { useICloudBackup } from "@reverbia/sdk/react";

function BackupButton() {
  const { backup, restore, isConfigured, isAuthenticated, isAvailable } = useICloudBackup({
    database,
    userAddress,
    requestEncryptionKey,
    exportConversation,
    importConversation,
  });

  if (!isAvailable) {
    return <p>CloudKit JS not loaded</p>;
  }

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

  return <button onClick={handleBackup} disabled={!isConfigured}>Backup to iCloud</button>;
}
```
