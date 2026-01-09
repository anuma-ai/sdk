# BackupAuthProvider()

> **BackupAuthProvider**(`__namedParameters`: [`BackupAuthProviderProps`](../Internal/interfaces/BackupAuthProviderProps.md)): `Element`

Defined in: [src/react/useBackupAuth.ts:147](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L147)

Unified provider component for backup OAuth authentication.

Wrap your app with this provider to enable both Dropbox and Google Drive
authentication. It handles the OAuth 2.0 Authorization Code flow with
refresh tokens for both providers.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | [`BackupAuthProviderProps`](../Internal/interfaces/BackupAuthProviderProps.md) |

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
      icloudApiToken={process.env.NEXT_PUBLIC_CLOUDKIT_API_TOKEN}
      icloudContainerIdentifier="iCloud.Memoryless"
      apiClient={apiClient}
    >
      <MyApp />
    </BackupAuthProvider>
  );
}
```
