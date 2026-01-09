# useICloudBackup()

> **useICloudBackup**(`options`: [`UseICloudBackupOptions`](../Internal/interfaces/UseICloudBackupOptions.md)): [`UseICloudBackupResult`](../Internal/interfaces/UseICloudBackupResult.md)

Defined in: [src/react/useICloudBackup.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudBackup.ts#L105)

React hook for iCloud backup and restore functionality.

This hook provides methods to backup conversations to iCloud and restore them.
It handles all the logic for checking timestamps, skipping unchanged files,
authentication, and managing the backup/restore process.

Must be used within an ICloudAuthProvider.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`UseICloudBackupOptions`](../Internal/interfaces/UseICloudBackupOptions.md) |

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
