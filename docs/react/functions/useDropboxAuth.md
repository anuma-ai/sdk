# useDropboxAuth()

> **useDropboxAuth**(): [`DropboxAuthContextValue`](../interfaces/DropboxAuthContextValue.md)

Defined in: [src/react/useDropboxAuth.ts:201](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L201)

Hook to access Dropbox authentication state and methods.

Must be used within a DropboxAuthProvider.

## Returns

[`DropboxAuthContextValue`](../interfaces/DropboxAuthContextValue.md)

## Example

```tsx
import { useDropboxAuth } from "@reverbia/sdk/react";

function DropboxButton() {
  const { isAuthenticated, isConfigured, requestAccess, logout } = useDropboxAuth();

  if (!isConfigured) {
    return <p>Dropbox not configured</p>;
  }

  if (isAuthenticated) {
    return <button onClick={logout}>Disconnect Dropbox</button>;
  }

  return <button onClick={requestAccess}>Connect Dropbox</button>;
}
```
