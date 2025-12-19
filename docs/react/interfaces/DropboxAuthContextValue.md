# DropboxAuthContextValue

Defined in: [src/react/useDropboxAuth.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L44)

Context value for Dropbox authentication

## Properties

### accessToken

> **accessToken**: `string` \| `null`

Defined in: [src/react/useDropboxAuth.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L46)

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useDropboxAuth.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L48)

Whether user has authenticated with Dropbox

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useDropboxAuth.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L50)

Whether Dropbox is configured (app key exists)

***

### logout()

> **logout**: () => `Promise`\<`void`\>

Defined in: [src/react/useDropboxAuth.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L54)

Clear stored token and log out

#### Returns

`Promise`\<`void`\>

***

### refreshToken()

> **refreshToken**: () => `Promise`\<`string` \| `null`\>

Defined in: [src/react/useDropboxAuth.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L56)

Refresh the access token using the refresh token

#### Returns

`Promise`\<`string` \| `null`\>

***

### requestAccess()

> **requestAccess**: () => `Promise`\<`string`\>

Defined in: [src/react/useDropboxAuth.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L52)

Request Dropbox access - returns token or redirects to OAuth

#### Returns

`Promise`\<`string`\>
