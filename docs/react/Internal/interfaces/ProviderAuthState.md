# ProviderAuthState

Defined in: [src/react/useBackupAuth.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#42)

Auth state for a single provider

## Properties

### accessToken

> **accessToken**: `string` | `null`

Defined in: [src/react/useBackupAuth.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#44)

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useBackupAuth.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#46)

Whether user has authenticated with this provider

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useBackupAuth.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#48)

Whether this provider is configured

***

### logout()

> **logout**: () => `Promise`<`void`>

Defined in: [src/react/useBackupAuth.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#52)

Sign out of iCloud

**Returns**

`Promise`<`void`>

***

### refreshToken()

> **refreshToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useBackupAuth.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#54)

Re-check the iCloud session and return the user record name

**Returns**

`Promise`<`string` | `null`>

***

### requestAccess()

> **requestAccess**: () => `Promise`<`string`>

Defined in: [src/react/useBackupAuth.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#50)

Request access - triggers iCloud sign-in if needed and returns the user record name

**Returns**

`Promise`<`string`>
