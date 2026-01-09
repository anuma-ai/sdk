# ICloudAuthProvider()

> **ICloudAuthProvider**(`__namedParameters`: [`ICloudAuthProviderProps`](../Internal/interfaces/ICloudAuthProviderProps.md)): `Element`

Defined in: [src/react/useICloudAuth.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useICloudAuth.ts#L83)

Provider component for iCloud authentication.

Wrap your app with this provider to enable iCloud authentication.
CloudKit JS is loaded automatically when needed.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `__namedParameters` | [`ICloudAuthProviderProps`](../Internal/interfaces/ICloudAuthProviderProps.md) |

## Returns

`Element`

## Example

```tsx
import { ICloudAuthProvider } from "@reverbia/sdk/react";

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
