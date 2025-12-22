# useDropboxBackup()

> **useDropboxBackup**(`options`): [`UseDropboxBackupResult`](../interfaces/UseDropboxBackupResult.md)

Defined in: [src/react/useDropboxBackup.ts:101](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxBackup.ts#L101)

React hook for Dropbox backup and restore functionality.

This hook provides methods to backup conversations to Dropbox and restore them.
It handles all the logic for checking timestamps, skipping unchanged files,
authentication, and managing the backup/restore process.

Must be used within a DropboxAuthProvider.

## Parameters

### options

[`UseDropboxBackupOptions`](../interfaces/UseDropboxBackupOptions.md)

## Returns

[`UseDropboxBackupResult`](../interfaces/UseDropboxBackupResult.md)

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
