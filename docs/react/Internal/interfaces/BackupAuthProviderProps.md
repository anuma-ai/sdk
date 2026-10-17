# BackupAuthProviderProps

Defined in: [src/react/useBackupAuth.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#26)

Props for BackupAuthProvider

## Properties

### children

> **children**: `ReactNode`

Defined in: [src/react/useBackupAuth.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#36)

Children to render

***

### icloudApiToken?

> `optional` **icloudApiToken**: `string`

Defined in: [src/react/useBackupAuth.ts:28](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#28)

CloudKit API token (from Apple Developer Console). Optional - omit to disable iCloud.

***

### icloudContainerIdentifier?

> `optional` **icloudContainerIdentifier**: `string`

Defined in: [src/react/useBackupAuth.ts:30](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#30)

CloudKit container identifier (default: "iCloud.Memoryless")

***

### icloudEnvironment?

> `optional` **icloudEnvironment**: `"development"` | `"production"`

Defined in: [src/react/useBackupAuth.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#32)

CloudKit environment (default: "production")

***

### ~~walletAddress?~~

> `optional` **walletAddress**: `string`

Defined in: [src/react/useBackupAuth.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#34)

**Deprecated**

This prop is ignored.
