# ProviderAuthState

Defined in: [src/react/useBackupAuth.ts:83](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#83)

Auth state for a single provider

## Properties

### accessToken

> **accessToken**: `string` | `null`

Defined in: [src/react/useBackupAuth.ts:85](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#85)

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useBackupAuth.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#87)

Whether user has authenticated with this provider

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useBackupAuth.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#89)

Whether this provider is configured

***

### logout()

> **logout**: () => `Promise`<`void`>

Defined in: [src/react/useBackupAuth.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#93)

Clear stored token and log out

**Returns**

`Promise`<`void`>

***

### refreshToken()

> **refreshToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useBackupAuth.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#95)

Refresh the access token using the refresh token

**Returns**

`Promise`<`string` | `null`>

***

### requestAccess()

> **requestAccess**: () => `Promise`<`string`>

Defined in: [src/react/useBackupAuth.ts:91](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#91)

Request access - returns token or redirects to OAuth

**Returns**

`Promise`<`string`>
