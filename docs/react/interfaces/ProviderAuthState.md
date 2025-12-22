# ProviderAuthState

Defined in: [src/react/useBackupAuth.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L75)

Auth state for a single provider

## Properties

### accessToken

> **accessToken**: `string` \| `null`

Defined in: [src/react/useBackupAuth.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L77)

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useBackupAuth.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L79)

Whether user has authenticated with this provider

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useBackupAuth.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L81)

Whether this provider is configured

***

### logout()

> **logout**: () => `Promise`\<`void`\>

Defined in: [src/react/useBackupAuth.ts:85](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L85)

Clear stored token and log out

#### Returns

`Promise`\<`void`\>

***

### refreshToken()

> **refreshToken**: () => `Promise`\<`string` \| `null`\>

Defined in: [src/react/useBackupAuth.ts:87](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L87)

Refresh the access token using the refresh token

#### Returns

`Promise`\<`string` \| `null`\>

***

### requestAccess()

> **requestAccess**: () => `Promise`\<`string`\>

Defined in: [src/react/useBackupAuth.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useBackupAuth.ts#L83)

Request access - returns token or redirects to OAuth

#### Returns

`Promise`\<`string`\>
