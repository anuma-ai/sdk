# DropboxAuthProvider()

> **DropboxAuthProvider**(`__namedParameters`): `Element`

Defined in: [src/react/useDropboxAuth.ts:76](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L76)

Provider component for Dropbox OAuth authentication.

Wrap your app with this provider to enable Dropbox authentication.
It handles the OAuth 2.0 PKCE flow automatically.

## Parameters

### \_\_namedParameters

[`DropboxAuthProviderProps`](../interfaces/DropboxAuthProviderProps.md)

## Returns

`Element`

## Example

```tsx
import { DropboxAuthProvider } from "@reverbia/sdk/react";

function App() {
  return (
    <DropboxAuthProvider
      appKey={process.env.NEXT_PUBLIC_DROPBOX_APP_KEY}
      callbackPath="/auth/dropbox/callback"
    >
      <MyApp />
    </DropboxAuthProvider>
  );
}
```
