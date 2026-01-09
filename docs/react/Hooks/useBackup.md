# useBackup()

> **useBackup**(`options`: [`UseBackupOptions`](../Internal/interfaces/UseBackupOptions.md)): [`UseBackupResult`](../Internal/interfaces/UseBackupResult.md)

Defined in: [src/react/useBackup.ts:181](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackup.ts#L181)

Unified React hook for backup and restore functionality.

This hook provides methods to backup conversations to both Dropbox and Google Drive,
and restore them. It handles all the logic for checking timestamps, skipping
unchanged files, authentication, and managing the backup/restore process.

Must be used within a BackupAuthProvider.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `options` | [`UseBackupOptions`](../Internal/interfaces/UseBackupOptions.md) |

## Returns

[`UseBackupResult`](../Internal/interfaces/UseBackupResult.md)

## Example

```tsx
import { useBackup } from "@reverbia/sdk/react";

function BackupManager() {
  const { dropbox, googleDrive, hasAnyProvider } = useBackup({
    database,
    userAddress,
    requestEncryptionKey,
    exportConversation,
    importConversation,
  });

  if (!hasAnyProvider) {
    return <p>No backup providers configured</p>;
  }

  return (
    <div>
      {dropbox.isConfigured && (
        <div>
          <h3>Dropbox</h3>
          {dropbox.isAuthenticated ? (
            <>
              <button onClick={() => dropbox.backup()}>Backup</button>
              <button onClick={() => dropbox.restore()}>Restore</button>
              <button onClick={dropbox.disconnect}>Disconnect</button>
            </>
          ) : (
            <button onClick={dropbox.connect}>Connect Dropbox</button>
          )}
        </div>
      )}

      {googleDrive.isConfigured && (
        <div>
          <h3>Google Drive</h3>
          {googleDrive.isAuthenticated ? (
            <>
              <button onClick={() => googleDrive.backup()}>Backup</button>
              <button onClick={() => googleDrive.restore()}>Restore</button>
              <button onClick={googleDrive.disconnect}>Disconnect</button>
            </>
          ) : (
            <button onClick={googleDrive.connect}>Connect Google Drive</button>
          )}
        </div>
      )}
    </div>
  );
}
```
