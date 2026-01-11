# DropboxAuthProvider

> **DropboxAuthProvider**(`__namedParameters`: [`DropboxAuthProviderProps`](../interfaces/DropboxAuthProviderProps.md)): `Element`

Defined in: [src/react/useDropboxAuth.ts:91](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDropboxAuth.ts#L91)

Provider component for Dropbox OAuth authentication.

Wrap your app with this provider to enable Dropbox authentication.
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

[`DropboxAuthProviderProps`](../interfaces/DropboxAuthProviderProps.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Element`

## Example

```tsx
import { DropboxAuthProvider } from "@reverbia/sdk/react";

function App() {
  return (
    <DropboxAuthProvider
      appKey={process.env.NEXT_PUBLIC_DROPBOX_APP_KEY}
      callbackPath="/auth/dropbox/callback"
    >
      <MyApp />
    </DropboxAuthProvider>
  );
}
```
