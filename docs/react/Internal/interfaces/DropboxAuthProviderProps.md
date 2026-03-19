# DropboxAuthProviderProps

Defined in: [src/react/useDropboxAuth.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#29)

Props for DropboxAuthProvider

## Properties

### apiClient?

> `optional` **apiClient**: `Client`

Defined in: [src/react/useDropboxAuth.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#38)

API client for backend OAuth requests. Optional - uses the default SDK client if not provided.
Only needed if you have a custom client configuration (e.g., different baseUrl).

***

### appKey

> **appKey**: `string` | `undefined`

Defined in: [src/react/useDropboxAuth.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#31)

Dropbox App Key (from Dropbox Developer Console)

***

### callbackPath?

> `optional` **callbackPath**: `string`

Defined in: [src/react/useDropboxAuth.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#33)

OAuth callback path (default: "/auth/dropbox/callback")

***

### children

> **children**: `ReactNode`

Defined in: [src/react/useDropboxAuth.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#46)

Children to render

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/react/useDropboxAuth.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/react/useDropboxAuth.ts#44)

Wallet address for encrypting OAuth tokens at rest.
If provided, tokens will be encrypted before storing in localStorage.
If omitted, tokens are stored temporarily in sessionStorage (cleared on page close).
