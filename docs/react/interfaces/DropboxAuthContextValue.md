# DropboxAuthContextValue

Defined in: [src/react/useDropboxAuth.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L37)

Context value for Dropbox authentication

## Properties

### accessToken

> **accessToken**: `string` \| `null`

Defined in: [src/react/useDropboxAuth.ts:39](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L39)

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useDropboxAuth.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L41)

Whether user has authenticated with Dropbox

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useDropboxAuth.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L43)

Whether Dropbox is configured (app key exists)

***

### logout()

> **logout**: () => `void`

Defined in: [src/react/useDropboxAuth.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L47)

Clear stored token and log out

#### Returns

`void`

***

### requestAccess()

> **requestAccess**: () => `Promise`\<`string`\>

Defined in: [src/react/useDropboxAuth.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L45)

Request Dropbox access - returns token or redirects to OAuth

#### Returns

`Promise`\<`string`\>
