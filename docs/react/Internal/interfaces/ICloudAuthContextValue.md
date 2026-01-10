# ICloudAuthContextValue

Defined in: src/react/useICloudAuth.ts:41

Context value for iCloud authentication

## Properties

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: src/react/useICloudAuth.ts:43

Whether user is authenticated with iCloud

***

### isAvailable

> **isAvailable**: `boolean`

Defined in: src/react/useICloudAuth.ts:47

Whether CloudKit JS is loaded

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: src/react/useICloudAuth.ts:45

Whether iCloud is configured and available

***

### logout()

> **logout**: () => `void`

Defined in: src/react/useICloudAuth.ts:53

Sign out from iCloud

**Returns**

`void`

***

### requestAccess()

> **requestAccess**: () => `Promise`<`void`>

Defined in: src/react/useICloudAuth.ts:51

Request access - triggers iCloud sign-in if needed

**Returns**

`Promise`<`void`>

***

### userRecordName

> **userRecordName**: `string` | `null`

Defined in: src/react/useICloudAuth.ts:49

User record name (unique identifier)
