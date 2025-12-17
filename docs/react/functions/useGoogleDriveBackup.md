# useGoogleDriveBackup()

> **useGoogleDriveBackup**(`options`): [`UseGoogleDriveBackupResult`](../interfaces/UseGoogleDriveBackupResult.md)

Defined in: [src/react/useGoogleDriveBackup.ts:110](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveBackup.ts#L110)

React hook for Google Drive backup and restore functionality.

This hook provides methods to backup conversations to Google Drive and restore them.
It handles all the logic for checking timestamps, skipping unchanged files,
and managing the backup/restore process.

Unlike Dropbox, Google Drive auth requires browser-specific setup (Google Identity Services),
so the auth provider must be implemented in the app. This hook accepts the auth
callbacks as options.

## Parameters

### options

[`UseGoogleDriveBackupOptions`](../interfaces/UseGoogleDriveBackupOptions.md)

## Returns

[`UseGoogleDriveBackupResult`](../interfaces/UseGoogleDriveBackupResult.md)

## Example

```tsx
import { useGoogleDriveBackup } from "@reverbia/sdk/react";

function BackupButton() {
  const { accessToken, requestDriveAccess } = useGoogleAccessToken();
  const { backup, restore, isAuthenticated } = useGoogleDriveBackup({
    database,
    userAddress,
    accessToken,
    requestDriveAccess,
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

  return <button onClick={handleBackup}>Backup</button>;
}
```
