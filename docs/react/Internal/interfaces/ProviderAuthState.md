# ProviderAuthState

Defined in: [src/react/useBackupAuth.ts:82](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#82)

Auth state for a single provider

## Properties

### accessToken

> **accessToken**: `string` | `null`

Defined in: [src/react/useBackupAuth.ts:84](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#84)

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useBackupAuth.ts:86](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#86)

Whether user has authenticated with this provider

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useBackupAuth.ts:88](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#88)

Whether this provider is configured

***

### logout()

> **logout**: () => `Promise`<`void`>

Defined in: [src/react/useBackupAuth.ts:92](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#92)

Clear stored token and log out

**Returns**

`Promise`<`void`>

***

### refreshToken()

> **refreshToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useBackupAuth.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#94)

Refresh the access token using the refresh token

**Returns**

`Promise`<`string` | `null`>

***

### requestAccess()

> **requestAccess**: () => `Promise`<`string`>

Defined in: [src/react/useBackupAuth.ts:90](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#90)

Request access - returns token or redirects to OAuth

**Returns**

`Promise`<`string`>
