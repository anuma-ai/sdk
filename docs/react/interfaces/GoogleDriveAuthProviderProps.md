# GoogleDriveAuthProviderProps

Defined in: [src/react/useGoogleDriveAuth.ts:29](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L29)

Props for GoogleDriveAuthProvider

## Properties

### apiClient?

> `optional` **apiClient**: `Client`

Defined in: [src/react/useGoogleDriveAuth.ts:38](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L38)

API client for backend OAuth requests. Optional - uses the default SDK client if not provided.
Only needed if you have a custom client configuration (e.g., different baseUrl).

***

### callbackPath?

> `optional` **callbackPath**: `string`

Defined in: [src/react/useGoogleDriveAuth.ts:33](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L33)

OAuth callback path (default: "/auth/google/callback")

***

### children

> **children**: `ReactNode`

Defined in: [src/react/useGoogleDriveAuth.ts:40](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L40)

Children to render

***

### clientId

> **clientId**: `string` \| `undefined`

Defined in: [src/react/useGoogleDriveAuth.ts:31](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L31)

Google OAuth Client ID (from Google Cloud Console)
