# DropboxAuthProviderProps

Defined in: [src/react/useDropboxAuth.ts:27](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L27)

Props for DropboxAuthProvider

## Properties

### apiClient?

> `optional` **apiClient**: `Client`

Defined in: [src/react/useDropboxAuth.ts:36](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L36)

API client for backend OAuth requests. Optional - uses the default SDK client if not provided.
Only needed if you have a custom client configuration (e.g., different baseUrl).

***

### appKey

> **appKey**: `string` \| `undefined`

Defined in: [src/react/useDropboxAuth.ts:29](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L29)

Dropbox App Key (from Dropbox Developer Console)

***

### callbackPath?

> `optional` **callbackPath**: `string`

Defined in: [src/react/useDropboxAuth.ts:31](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L31)

OAuth callback path (default: "/auth/dropbox/callback")

***

### children

> **children**: `ReactNode`

Defined in: [src/react/useDropboxAuth.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L38)

Children to render
