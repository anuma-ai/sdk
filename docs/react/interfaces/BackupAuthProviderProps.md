# BackupAuthProviderProps

Defined in: [src/react/useBackupAuth.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L49)

Props for BackupAuthProvider

At least one of `dropboxAppKey`, `googleClientId`, or `icloudApiToken` should be provided
for the provider to be useful. All are optional to allow using just one backup provider.

## Properties

### apiClient?

> `optional` **apiClient**: `Client`

Defined in: [src/react/useBackupAuth.ts:68](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L68)

API client for backend OAuth requests. Optional - uses the default SDK client if not provided.
Only needed if you have a custom client configuration (e.g., different baseUrl).

***

### children

> **children**: `ReactNode`

Defined in: [src/react/useBackupAuth.ts:76](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L76)

Children to render

***

### dropboxAppKey?

> `optional` **dropboxAppKey**: `string`

Defined in: [src/react/useBackupAuth.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L51)

Dropbox App Key (from Dropbox Developer Console). Optional - omit to disable Dropbox.

***

### dropboxCallbackPath?

> `optional` **dropboxCallbackPath**: `string`

Defined in: [src/react/useBackupAuth.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L53)

Dropbox OAuth callback path (default: "/auth/dropbox/callback")

***

### googleCallbackPath?

> `optional` **googleCallbackPath**: `string`

Defined in: [src/react/useBackupAuth.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L57)

Google OAuth callback path (default: "/auth/google/callback")

***

### googleClientId?

> `optional` **googleClientId**: `string`

Defined in: [src/react/useBackupAuth.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L55)

Google OAuth Client ID (from Google Cloud Console). Optional - omit to disable Google Drive.

***

### icloudApiToken?

> `optional` **icloudApiToken**: `string`

Defined in: [src/react/useBackupAuth.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L59)

CloudKit API token (from Apple Developer Console). Optional - omit to disable iCloud.

***

### icloudContainerIdentifier?

> `optional` **icloudContainerIdentifier**: `string`

Defined in: [src/react/useBackupAuth.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L61)

CloudKit container identifier (default: "iCloud.Memoryless")

***

### icloudEnvironment?

> `optional` **icloudEnvironment**: `"development"` \| `"production"`

Defined in: [src/react/useBackupAuth.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L63)

CloudKit environment (default: "production")

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/react/useBackupAuth.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L74)

Wallet address for encrypting OAuth tokens at rest.
If provided, tokens will be encrypted before storing in localStorage.
If omitted, tokens are stored temporarily in sessionStorage (cleared on page close).
