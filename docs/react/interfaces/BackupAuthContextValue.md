# BackupAuthContextValue

Defined in: [src/react/useBackupAuth.ts:93](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L93)

Context value for unified backup authentication

## Properties

### dropbox

> **dropbox**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:95](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L95)

Dropbox authentication state and methods

***

### googleDrive

> **googleDrive**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:97](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L97)

Google Drive authentication state and methods

***

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: [src/react/useBackupAuth.ts:103](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L103)

Check if any provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: [src/react/useBackupAuth.ts:101](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L101)

Check if any provider is configured

***

### icloud

> **icloud**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:99](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L99)

iCloud authentication state and methods

***

### logoutAll()

> **logoutAll**: () => `Promise`\<`void`\>

Defined in: [src/react/useBackupAuth.ts:105](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L105)

Logout from all providers

#### Returns

`Promise`\<`void`\>
