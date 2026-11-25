# ICloudAuthContextValue

Defined in: [src/react/useICloudAuth.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudAuth.ts#41)

Context value for iCloud authentication

## Properties

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useICloudAuth.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudAuth.ts#43)

Whether user is authenticated with iCloud

***

### isAvailable

> **isAvailable**: `boolean`

Defined in: [src/react/useICloudAuth.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudAuth.ts#47)

Whether CloudKit JS is loaded

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useICloudAuth.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudAuth.ts#45)

Whether iCloud is configured and available

***

### logout()

> **logout**: () => `void`

Defined in: [src/react/useICloudAuth.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudAuth.ts#54)

Sign out from iCloud

**Returns**

`void`

***

### userRecordName

> **userRecordName**: `string` | `null`

Defined in: [src/react/useICloudAuth.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudAuth.ts#49)

User record name (unique identifier)

## Methods

### requestAccess()

**Call Signature**

> **requestAccess**(): `Promise`<`void`>

Defined in: [src/react/useICloudAuth.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudAuth.ts#51)

Request access - triggers iCloud sign-in if needed

**Returns**

`Promise`<`void`>

**Call Signature**

> **requestAccess**(`options`: `object`): `Promise`<`void`>

Defined in: [src/react/useICloudAuth.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/react/useICloudAuth.ts#52)

**Parameters**

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

`options`

</td>
<td>

`object`

</td>
</tr>
<tr>
<td>

`options.signal?`

</td>
<td>

`AbortSignal`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`void`>
