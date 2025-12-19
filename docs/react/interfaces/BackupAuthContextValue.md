# BackupAuthContextValue

Defined in: [src/react/useBackupAuth.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L80)

Context value for unified backup authentication

## Properties

### dropbox

> **dropbox**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:82](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L82)

Dropbox authentication state and methods

***

### googleDrive

> **googleDrive**: [`ProviderAuthState`](ProviderAuthState.md)

Defined in: [src/react/useBackupAuth.ts:84](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L84)

Google Drive authentication state and methods

***

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: [src/react/useBackupAuth.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L88)

Check if any provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: [src/react/useBackupAuth.ts:86](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L86)

Check if any provider is configured

***

### logoutAll()

> **logoutAll**: () => `Promise`\<`void`\>

Defined in: [src/react/useBackupAuth.ts:90](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L90)

Logout from all providers

#### Returns

`Promise`\<`void`\>
