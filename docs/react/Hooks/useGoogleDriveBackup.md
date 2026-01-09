# useGoogleDriveBackup()

> **useGoogleDriveBackup**(`options`: [`UseGoogleDriveBackupOptions`](../Internal/interfaces/UseGoogleDriveBackupOptions.md)): [`UseGoogleDriveBackupResult`](../Internal/interfaces/UseGoogleDriveBackupResult.md)

Defined in: [src/react/useGoogleDriveBackup.ts:104](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L104)

React hook for Google Drive backup and restore functionality.

This hook provides methods to backup conversations to Google Drive and restore them.
It handles all the logic for checking timestamps, skipping unchanged files,
authentication, and managing the backup/restore process.

Must be used within a GoogleDriveAuthProvider.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`UseGoogleDriveBackupOptions`](../Internal/interfaces/UseGoogleDriveBackupOptions.md) |

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
