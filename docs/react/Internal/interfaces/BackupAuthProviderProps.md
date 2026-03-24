# BackupAuthProviderProps

Defined in: [src/react/useBackupAuth.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#48)

Props for BackupAuthProvider

At least one of `dropboxAppKey`, `googleClientId`, or `icloudApiToken` should be provided
for the provider to be useful. All are optional to allow using just one backup provider.

## Properties

### apiClient?

> `optional` **apiClient**: `Client`

Defined in: [src/react/useBackupAuth.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#67)

API client for backend OAuth requests. Optional - uses the default SDK client if not provided.
Only needed if you have a custom client configuration (e.g., different baseUrl).

***

### children

> **children**: `ReactNode`

Defined in: [src/react/useBackupAuth.ts:75](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#75)

Children to render

***

### dropboxAppKey?

> `optional` **dropboxAppKey**: `string`

Defined in: [src/react/useBackupAuth.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#50)

Dropbox App Key (from Dropbox Developer Console). Optional - omit to disable Dropbox.

***

### dropboxCallbackPath?

> `optional` **dropboxCallbackPath**: `string`

Defined in: [src/react/useBackupAuth.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#52)

Dropbox OAuth callback path (default: "/auth/dropbox/callback")

***

### googleCallbackPath?

> `optional` **googleCallbackPath**: `string`

Defined in: [src/react/useBackupAuth.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#56)

Google OAuth callback path (default: "/auth/google/callback")

***

### googleClientId?

> `optional` **googleClientId**: `string`

Defined in: [src/react/useBackupAuth.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#54)

Google OAuth Client ID (from Google Cloud Console). Optional - omit to disable Google Drive.

***

### icloudApiToken?

> `optional` **icloudApiToken**: `string`

Defined in: [src/react/useBackupAuth.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#58)

CloudKit API token (from Apple Developer Console). Optional - omit to disable iCloud.

***

### icloudContainerIdentifier?

> `optional` **icloudContainerIdentifier**: `string`

Defined in: [src/react/useBackupAuth.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#60)

CloudKit container identifier (default: "iCloud.Memoryless")

***

### icloudEnvironment?

> `optional` **icloudEnvironment**: `"development"` | `"production"`

Defined in: [src/react/useBackupAuth.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#62)

CloudKit environment (default: "production")

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/react/useBackupAuth.ts:73](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#73)

Wallet address for encrypting OAuth tokens at rest.
If provided, tokens will be encrypted before storing in localStorage.
If omitted, tokens are stored temporarily in sessionStorage (cleared on page close).
