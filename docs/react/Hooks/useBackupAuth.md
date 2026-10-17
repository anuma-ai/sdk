# useBackupAuth

> **useBackupAuth**(): [`BackupAuthContextValue`](../Internal/interfaces/BackupAuthContextValue.md)

Defined in: [src/react/useBackupAuth.ts:236](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#236)

Hook to access unified backup authentication state and methods.

Must be used within a BackupAuthProvider.

## Returns

[`BackupAuthContextValue`](../Internal/interfaces/BackupAuthContextValue.md)

## Example

```tsx
import { useBackupAuth } from "@anuma/sdk/react";

function BackupSettings() {
  const { icloud, logoutAll } = useBackupAuth();

  if (!icloud.isConfigured) return null;

  return (
    <div>
      <span>iCloud: {icloud.isAuthenticated ? 'Connected' : 'Not connected'}</span>
      {icloud.isAuthenticated ? (
        <button onClick={logoutAll}>Disconnect</button>
      ) : (
        <button onClick={icloud.requestAccess}>Connect</button>
      )}
    </div>
  );
}
```
