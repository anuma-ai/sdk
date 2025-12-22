# useGoogleDriveAuth()

> **useGoogleDriveAuth**(): [`GoogleDriveAuthContextValue`](../interfaces/GoogleDriveAuthContextValue.md)

Defined in: [src/react/useGoogleDriveAuth.ts:204](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L204)

Hook to access Google Drive authentication state and methods.

Must be used within a GoogleDriveAuthProvider.

## Returns

[`GoogleDriveAuthContextValue`](../interfaces/GoogleDriveAuthContextValue.md)

## Example

```tsx
import { useGoogleDriveAuth } from "@reverbia/sdk/react";

function GoogleDriveButton() {
  const { isAuthenticated, isConfigured, requestAccess, logout } = useGoogleDriveAuth();

  if (!isConfigured) {
    return <p>Google Drive not configured</p>;
  }

  if (isAuthenticated) {
    return <button onClick={logout}>Disconnect Google Drive</button>;
  }

  return <button onClick={requestAccess}>Connect Google Drive</button>;
}
```
