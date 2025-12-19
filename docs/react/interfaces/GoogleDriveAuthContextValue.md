# GoogleDriveAuthContextValue

Defined in: [src/react/useGoogleDriveAuth.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L46)

Context value for Google Drive authentication

## Properties

### accessToken

> **accessToken**: `string` \| `null`

Defined in: [src/react/useGoogleDriveAuth.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L48)

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useGoogleDriveAuth.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L50)

Whether user has authenticated with Google Drive

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useGoogleDriveAuth.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L52)

Whether Google Drive is configured (client ID exists)

***

### logout()

> **logout**: () => `Promise`\<`void`\>

Defined in: [src/react/useGoogleDriveAuth.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L56)

Clear stored token and log out

#### Returns

`Promise`\<`void`\>

***

### refreshToken()

> **refreshToken**: () => `Promise`\<`string` \| `null`\>

Defined in: [src/react/useGoogleDriveAuth.ts:58](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L58)

Refresh the access token using the refresh token

#### Returns

`Promise`\<`string` \| `null`\>

***

### requestAccess()

> **requestAccess**: () => `Promise`\<`string`\>

Defined in: [src/react/useGoogleDriveAuth.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L54)

Request Google Drive access - returns token or redirects to OAuth

#### Returns

`Promise`\<`string`\>
