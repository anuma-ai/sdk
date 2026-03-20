# GoogleDriveAuthProviderProps

Defined in: [src/react/useGoogleDriveAuth.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#31)

Props for GoogleDriveAuthProvider

## Properties

### apiClient?

> `optional` **apiClient**: `Client`

Defined in: [src/react/useGoogleDriveAuth.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#40)

API client for backend OAuth requests. Optional - uses the default SDK client if not provided.
Only needed if you have a custom client configuration (e.g., different baseUrl).

***

### callbackPath?

> `optional` **callbackPath**: `string`

Defined in: [src/react/useGoogleDriveAuth.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#35)

OAuth callback path (default: "/auth/google/callback")

***

### children

> **children**: `ReactNode`

Defined in: [src/react/useGoogleDriveAuth.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#48)

Children to render

***

### clientId

> **clientId**: `string` | `undefined`

Defined in: [src/react/useGoogleDriveAuth.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#33)

Google OAuth Client ID (from Google Cloud Console)

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/react/useGoogleDriveAuth.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#46)

Wallet address for encrypting OAuth tokens at rest.
If provided, tokens will be encrypted before storing in localStorage.
If omitted, tokens are stored temporarily in sessionStorage (cleared on page close).
