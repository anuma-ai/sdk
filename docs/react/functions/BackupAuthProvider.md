# BackupAuthProvider()

> **BackupAuthProvider**(`__namedParameters`): `Element`

Defined in: [src/react/useBackupAuth.ts:123](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L123)

Unified provider component for backup OAuth authentication.

Wrap your app with this provider to enable both Dropbox and Google Drive
authentication. It handles the OAuth 2.0 Authorization Code flow with
refresh tokens for both providers.

## Parameters

### \_\_namedParameters

[`BackupAuthProviderProps`](../interfaces/BackupAuthProviderProps.md)

## Returns

`Element`

## Example

```tsx
import { BackupAuthProvider } from "@reverbia/sdk/react";

function App() {
  return (
    <BackupAuthProvider
      dropboxAppKey={process.env.NEXT_PUBLIC_DROPBOX_APP_KEY}
      dropboxCallbackPath="/auth/dropbox/callback"
      googleClientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
      googleCallbackPath="/auth/google/callback"
      apiClient={apiClient}
    >
      <MyApp />
    </BackupAuthProvider>
  );
}
```
