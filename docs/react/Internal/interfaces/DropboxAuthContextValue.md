# DropboxAuthContextValue

Defined in: src/react/useDropboxAuth.ts:51

Context value for Dropbox authentication

## Properties

### accessToken

> **accessToken**: `string` | `null`

Defined in: src/react/useDropboxAuth.ts:53

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: src/react/useDropboxAuth.ts:55

Whether user has authenticated with Dropbox

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: src/react/useDropboxAuth.ts:57

Whether Dropbox is configured (app key exists)

***

### logout()

> **logout**: () => `Promise`<`void`>

Defined in: src/react/useDropboxAuth.ts:61

Clear stored token and log out

**Returns**

`Promise`<`void`>

***

### refreshToken()

> **refreshToken**: () => `Promise`<`string` | `null`>

Defined in: src/react/useDropboxAuth.ts:63

Refresh the access token using the refresh token

**Returns**

`Promise`<`string` | `null`>

***

### requestAccess()

> **requestAccess**: () => `Promise`<`string`>

Defined in: src/react/useDropboxAuth.ts:59

Request Dropbox access - returns token or redirects to OAuth

**Returns**

`Promise`<`string`>
