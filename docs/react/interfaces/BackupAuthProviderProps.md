# BackupAuthProviderProps

Defined in: [src/react/useBackupAuth.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L41)

Props for BackupAuthProvider

At least one of `dropboxAppKey` or `googleClientId` should be provided
for the provider to be useful. Both are optional to allow using just
one backup provider.

## Properties

### apiClient?

> `optional` **apiClient**: `Client`

Defined in: [src/react/useBackupAuth.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L54)

API client for backend OAuth requests. Optional - uses the default SDK client if not provided.
Only needed if you have a custom client configuration (e.g., different baseUrl).

***

### children

> **children**: `ReactNode`

Defined in: [src/react/useBackupAuth.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L56)

Children to render

***

### dropboxAppKey?

> `optional` **dropboxAppKey**: `string`

Defined in: [src/react/useBackupAuth.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L43)

Dropbox App Key (from Dropbox Developer Console). Optional - omit to disable Dropbox.

***

### dropboxCallbackPath?

> `optional` **dropboxCallbackPath**: `string`

Defined in: [src/react/useBackupAuth.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L45)

Dropbox OAuth callback path (default: "/auth/dropbox/callback")

***

### googleCallbackPath?

> `optional` **googleCallbackPath**: `string`

Defined in: [src/react/useBackupAuth.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L49)

Google OAuth callback path (default: "/auth/google/callback")

***

### googleClientId?

> `optional` **googleClientId**: `string`

Defined in: [src/react/useBackupAuth.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L47)

Google OAuth Client ID (from Google Cloud Console). Optional - omit to disable Google Drive.
