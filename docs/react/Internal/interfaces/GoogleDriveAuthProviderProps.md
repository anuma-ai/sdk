# GoogleDriveAuthProviderProps

Defined in: [src/react/useGoogleDriveAuth.ts:29](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#29)

Props for GoogleDriveAuthProvider

## Properties

### apiClient?

> `optional` **apiClient**: `Client`

Defined in: [src/react/useGoogleDriveAuth.ts:38](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#38)

API client for backend OAuth requests. Optional - uses the default SDK client if not provided.
Only needed if you have a custom client configuration (e.g., different baseUrl).

***

### callbackPath?

> `optional` **callbackPath**: `string`

Defined in: [src/react/useGoogleDriveAuth.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#33)

OAuth callback path (default: "/auth/google/callback")

***

### children

> **children**: `ReactNode`

Defined in: [src/react/useGoogleDriveAuth.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#46)

Children to render

***

### clientId

> **clientId**: `string` | `undefined`

Defined in: [src/react/useGoogleDriveAuth.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#31)

Google OAuth Client ID (from Google Cloud Console)

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/react/useGoogleDriveAuth.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#44)

Wallet address for encrypting OAuth tokens at rest.
If provided, tokens will be encrypted before storing in localStorage.
If omitted, tokens are stored temporarily in sessionStorage (cleared on page close).
