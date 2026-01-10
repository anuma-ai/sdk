# GoogleDriveAuthContextValue

Defined in: src/react/useGoogleDriveAuth.ts:53

Context value for Google Drive authentication

## Properties

### accessToken

> **accessToken**: `string` | `null`

Defined in: src/react/useGoogleDriveAuth.ts:55

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: src/react/useGoogleDriveAuth.ts:57

Whether user has authenticated with Google Drive

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: src/react/useGoogleDriveAuth.ts:59

Whether Google Drive is configured (client ID exists)

***

### logout()

> **logout**: () => `Promise`<`void`>

Defined in: src/react/useGoogleDriveAuth.ts:63

Clear stored token and log out

**Returns**

`Promise`<`void`>

***

### refreshToken()

> **refreshToken**: () => `Promise`<`string` | `null`>

Defined in: src/react/useGoogleDriveAuth.ts:65

Refresh the access token using the refresh token

**Returns**

`Promise`<`string` | `null`>

***

### requestAccess()

> **requestAccess**: () => `Promise`<`string`>

Defined in: src/react/useGoogleDriveAuth.ts:61

Request Google Drive access - returns token or redirects to OAuth

**Returns**

`Promise`<`string`>
