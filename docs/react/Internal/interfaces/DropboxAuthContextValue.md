# DropboxAuthContextValue

Defined in: [src/react/useDropboxAuth.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#52)

Context value for Dropbox authentication

## Properties

### accessToken

> **accessToken**: `string` | `null`

Defined in: [src/react/useDropboxAuth.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#54)

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useDropboxAuth.ts:56](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#56)

Whether user has authenticated with Dropbox

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useDropboxAuth.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#58)

Whether Dropbox is configured (app key exists)

***

### logout()

> **logout**: () => `Promise`<`void`>

Defined in: [src/react/useDropboxAuth.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#62)

Clear stored token and log out

**Returns**

`Promise`<`void`>

***

### refreshToken()

> **refreshToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useDropboxAuth.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#64)

Refresh the access token using the refresh token

**Returns**

`Promise`<`string` | `null`>

***

### requestAccess()

> **requestAccess**: () => `Promise`<`string`>

Defined in: [src/react/useDropboxAuth.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#60)

Request Dropbox access - returns token or redirects to OAuth

**Returns**

`Promise`<`string`>
