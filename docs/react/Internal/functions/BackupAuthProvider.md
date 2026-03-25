# BackupAuthProvider

> **BackupAuthProvider**(`__namedParameters`: [`BackupAuthProviderProps`](../interfaces/BackupAuthProviderProps.md)): `Element`

Defined in: [src/react/useBackupAuth.ts:145](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#145)

Unified provider component for backup OAuth authentication.

Wrap your app with this provider to enable both Dropbox and Google Drive
authentication. It handles the OAuth 2.0 Authorization Code flow with
refresh tokens for both providers.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`__namedParameters`

</td>
<td>

[`BackupAuthProviderProps`](../interfaces/BackupAuthProviderProps.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Element`

## Example

```tsx
import { BackupAuthProvider } from "@anuma/sdk/react";

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
