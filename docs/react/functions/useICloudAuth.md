# useICloudAuth()

> **useICloudAuth**(): [`ICloudAuthContextValue`](../interfaces/ICloudAuthContextValue.md)

Defined in: [src/react/useICloudAuth.ts:216](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudAuth.ts#L216)

Hook to access iCloud authentication state and methods.

Must be used within an ICloudAuthProvider.

## Returns

[`ICloudAuthContextValue`](../interfaces/ICloudAuthContextValue.md)

## Example

```tsx
import { useICloudAuth } from "@reverbia/sdk/react";

function ICloudStatus() {
  const { isAuthenticated, isAvailable, requestAccess, logout } = useICloudAuth();

  if (!isAvailable) {
    return <p>iCloud is not available. Please load CloudKit JS.</p>;
  }

  return (
    <div>
      {isAuthenticated ? (
        <>
          <span>Connected to iCloud</span>
          <button onClick={logout}>Disconnect</button>
        </>
      ) : (
        <button onClick={requestAccess}>Connect to iCloud</button>
      )}
    </div>
  );
}
```
