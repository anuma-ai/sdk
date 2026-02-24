# ICloudAuthProvider

> **ICloudAuthProvider**(`__namedParameters`: [`ICloudAuthProviderProps`](../interfaces/ICloudAuthProviderProps.md)): `Element`

Defined in: [src/react/useICloudAuth.ts:81](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudAuth.ts#81)

Provider component for iCloud authentication.

Wrap your app with this provider to enable iCloud authentication.
CloudKit JS is loaded automatically when needed.

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

[`ICloudAuthProviderProps`](../interfaces/ICloudAuthProviderProps.md)

</td>
</tr>
</tbody>
</table>

## Returns

`Element`

## Example

```tsx
import { ICloudAuthProvider } from "@anuma/sdk/react";

function App() {
  return (
    <ICloudAuthProvider
      apiToken={process.env.NEXT_PUBLIC_CLOUDKIT_API_TOKEN!}
      containerIdentifier="iCloud.Memoryless"
      environment="production"
    >
      <MyApp />
    </ICloudAuthProvider>
  );
}
```
