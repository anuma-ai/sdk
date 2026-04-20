# useBackupAuth

> **useBackupAuth**(): [`BackupAuthContextValue`](../Internal/interfaces/BackupAuthContextValue.md)

Defined in: [src/react/useBackupAuth.ts:495](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#495)

Hook to access unified backup authentication state and methods.

Must be used within a BackupAuthProvider.

## Returns

[`BackupAuthContextValue`](../Internal/interfaces/BackupAuthContextValue.md)

## Example

```tsx
import { useBackupAuth } from "@anuma/sdk/react";

function BackupSettings() {
  const { dropbox, googleDrive, logoutAll } = useBackupAuth();

  return (
    <div>
      <h3>Backup Providers</h3>

      {dropbox.isConfigured && (
        <div>
          <span>Dropbox: {dropbox.isAuthenticated ? 'Connected' : 'Not connected'}</span>
          {dropbox.isAuthenticated ? (
            <button onClick={dropbox.logout}>Disconnect</button>
          ) : (
            <button onClick={dropbox.requestAccess}>Connect</button>
          )}
        </div>
      )}

      {googleDrive.isConfigured && (
        <div>
          <span>Google Drive: {googleDrive.isAuthenticated ? 'Connected' : 'Not connected'}</span>
          {googleDrive.isAuthenticated ? (
            <button onClick={googleDrive.logout}>Disconnect</button>
          ) : (
            <button onClick={googleDrive.requestAccess}>Connect</button>
          )}
        </div>
      )}

      <button onClick={logoutAll}>Disconnect All</button>
    </div>
  );
}
```
