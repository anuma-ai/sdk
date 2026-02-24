# useDropboxAuth

> **useDropboxAuth**(): [`DropboxAuthContextValue`](../Internal/interfaces/DropboxAuthContextValue.md)

Defined in: [src/react/useDropboxAuth.ts:215](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#215)

Hook to access Dropbox authentication state and methods.

Must be used within a DropboxAuthProvider.

## Returns

[`DropboxAuthContextValue`](../Internal/interfaces/DropboxAuthContextValue.md)

## Example

```tsx
import { useDropboxAuth } from "@anuma/sdk/react";

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
