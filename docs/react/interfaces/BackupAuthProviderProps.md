# BackupAuthProviderProps

Defined in: [src/react/useBackupAuth.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L48)

Props for BackupAuthProvider

At least one of `dropboxAppKey`, `googleClientId`, or `icloudApiToken` should be provided
for the provider to be useful. All are optional to allow using just one backup provider.

## Properties

### apiClient?

> `optional` **apiClient**: `Client`

Defined in: [src/react/useBackupAuth.ts:67](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L67)

API client for backend OAuth requests. Optional - uses the default SDK client if not provided.
Only needed if you have a custom client configuration (e.g., different baseUrl).

***

### children

> **children**: `ReactNode`

Defined in: [src/react/useBackupAuth.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L69)

Children to render

***

### dropboxAppKey?

> `optional` **dropboxAppKey**: `string`

Defined in: [src/react/useBackupAuth.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L50)

Dropbox App Key (from Dropbox Developer Console). Optional - omit to disable Dropbox.

***

### dropboxCallbackPath?

> `optional` **dropboxCallbackPath**: `string`

Defined in: [src/react/useBackupAuth.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L52)

Dropbox OAuth callback path (default: "/auth/dropbox/callback")

***

### googleCallbackPath?

> `optional` **googleCallbackPath**: `string`

Defined in: [src/react/useBackupAuth.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L56)

Google OAuth callback path (default: "/auth/google/callback")

***

### googleClientId?

> `optional` **googleClientId**: `string`

Defined in: [src/react/useBackupAuth.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L54)

Google OAuth Client ID (from Google Cloud Console). Optional - omit to disable Google Drive.

***

### icloudApiToken?

> `optional` **icloudApiToken**: `string`

Defined in: [src/react/useBackupAuth.ts:58](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L58)

CloudKit API token (from Apple Developer Console). Optional - omit to disable iCloud.

***

### icloudContainerIdentifier?

> `optional` **icloudContainerIdentifier**: `string`

Defined in: [src/react/useBackupAuth.ts:60](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L60)

CloudKit container identifier (default: "iCloud.Memoryless")

***

### icloudEnvironment?

> `optional` **icloudEnvironment**: `"development"` \| `"production"`

Defined in: [src/react/useBackupAuth.ts:62](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L62)

CloudKit environment (default: "production")
