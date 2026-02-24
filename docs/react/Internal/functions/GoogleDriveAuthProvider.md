# GoogleDriveAuthProvider

> **GoogleDriveAuthProvider**(`__namedParameters`: [`GoogleDriveAuthProviderProps`](../interfaces/GoogleDriveAuthProviderProps.md)): `Element`

Defined in: [src/react/useGoogleDriveAuth.ts:93](https://github.com/anuma-ai/sdk/blob/main/src/react/useGoogleDriveAuth.ts#L93)

Provider component for Google Drive OAuth authentication.

Wrap your app with this provider to enable Google Drive authentication.
It handles the OAuth 2.0 Authorization Code flow with refresh tokens.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`__namedParameters`

</td>
<td>

[`GoogleDriveAuthProviderProps`](../interfaces/GoogleDriveAuthProviderProps.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Element`

## Example

```tsx
import { GoogleDriveAuthProvider } from "@anuma/sdk/react";

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
