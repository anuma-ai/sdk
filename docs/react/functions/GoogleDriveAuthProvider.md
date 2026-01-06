# GoogleDriveAuthProvider()

> **GoogleDriveAuthProvider**(`__namedParameters`: [`GoogleDriveAuthProviderProps`](../interfaces/GoogleDriveAuthProviderProps.md)): `Element`

Defined in: [src/react/useGoogleDriveAuth.ts:88](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useGoogleDriveAuth.ts#L88)

Provider component for Google Drive OAuth authentication.

Wrap your app with this provider to enable Google Drive authentication.
It handles the OAuth 2.0 Authorization Code flow with refresh tokens.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | [`GoogleDriveAuthProviderProps`](../interfaces/GoogleDriveAuthProviderProps.md) |

## Returns

`Element`

## Example

```tsx
import { GoogleDriveAuthProvider } from "@reverbia/sdk/react";

function App() {
  return (
    <GoogleDriveAuthProvider
      clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}
      callbackPath="/auth/google/callback"
    >
      <MyApp />
    </GoogleDriveAuthProvider>
  );
}
```
