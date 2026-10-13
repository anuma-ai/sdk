# BackupAuthProvider

> **BackupAuthProvider**(`__namedParameters`: [`BackupAuthProviderProps`](../interfaces/BackupAuthProviderProps.md)): `Element`

Defined in: [src/react/useBackupAuth.ts:95](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#95)

Provider component for backup authentication.

Wrap your app with this provider to enable iCloud backup authentication.

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

[`BackupAuthProviderProps`](../interfaces/BackupAuthProviderProps.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Element`

## Example

```tsx
import { BackupAuthProvider } from "@anuma/sdk/react";

function App() {
  return (
    <BackupAuthProvider
      icloudApiToken={process.env.NEXT_PUBLIC_CLOUDKIT_API_TOKEN}
      icloudContainerIdentifier="iCloud.Memoryless"
    >
      <MyApp />
    </BackupAuthProvider>
  );
}
```
