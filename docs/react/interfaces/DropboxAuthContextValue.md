# DropboxAuthContextValue

Defined in: [src/react/useDropboxAuth.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L51)

Context value for Dropbox authentication

## Properties

### accessToken

> **accessToken**: `string` \| `null`

Defined in: [src/react/useDropboxAuth.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L53)

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useDropboxAuth.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L55)

Whether user has authenticated with Dropbox

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useDropboxAuth.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L57)

Whether Dropbox is configured (app key exists)

***

### logout()

> **logout**: () => `Promise`\<`void`\>

Defined in: [src/react/useDropboxAuth.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L61)

Clear stored token and log out

#### Returns

`Promise`\<`void`\>

***

### refreshToken()

> **refreshToken**: () => `Promise`\<`string` \| `null`\>

Defined in: [src/react/useDropboxAuth.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L63)

Refresh the access token using the refresh token

#### Returns

`Promise`\<`string` \| `null`\>

***

### requestAccess()

> **requestAccess**: () => `Promise`\<`string`\>

Defined in: [src/react/useDropboxAuth.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L59)

Request Dropbox access - returns token or redirects to OAuth

#### Returns

`Promise`\<`string`\>
