# ProviderAuthState

Defined in: [src/react/useBackupAuth.ts:62](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L62)

Auth state for a single provider

## Properties

### accessToken

> **accessToken**: `string` \| `null`

Defined in: [src/react/useBackupAuth.ts:64](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L64)

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useBackupAuth.ts:66](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L66)

Whether user has authenticated with this provider

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useBackupAuth.ts:68](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L68)

Whether this provider is configured

***

### logout()

> **logout**: () => `Promise`\<`void`\>

Defined in: [src/react/useBackupAuth.ts:72](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L72)

Clear stored token and log out

#### Returns

`Promise`\<`void`\>

***

### refreshToken()

> **refreshToken**: () => `Promise`\<`string` \| `null`\>

Defined in: [src/react/useBackupAuth.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L74)

Refresh the access token using the refresh token

#### Returns

`Promise`\<`string` \| `null`\>

***

### requestAccess()

> **requestAccess**: () => `Promise`\<`string`\>

Defined in: [src/react/useBackupAuth.ts:70](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L70)

Request access - returns token or redirects to OAuth

#### Returns

`Promise`\<`string`\>
