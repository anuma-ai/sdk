# UseBackupResult

Defined in: [src/react/useBackup.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#70)

Result returned by useBackup hook

## Properties

### disconnectAll()

> **disconnectAll**: () => `Promise`<`void`>

Defined in: [src/react/useBackup.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#78)

Disconnect from all providers

**Returns**

`Promise`<`void`>

***

### hasAnyAuthentication

> **hasAnyAuthentication**: `boolean`

Defined in: [src/react/useBackup.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#76)

Whether any backup provider is authenticated

***

### hasAnyProvider

> **hasAnyProvider**: `boolean`

Defined in: [src/react/useBackup.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#74)

Whether any backup provider is configured

***

### icloud

> **icloud**: [`ProviderBackupState`](ProviderBackupState.md)

Defined in: [src/react/useBackup.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackup.ts#72)

iCloud backup state and methods
