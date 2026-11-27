# ProviderAuthState

Defined in: [src/react/useBackupAuth.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#42)

Auth state for a single provider

## Properties

### accessToken

> **accessToken**: `string` | `null`

Defined in: [src/react/useBackupAuth.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#44)

Current access token (null if not authenticated)

***

### isAuthenticated

> **isAuthenticated**: `boolean`

Defined in: [src/react/useBackupAuth.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#46)

Whether user has authenticated with this provider

***

### isConfigured

> **isConfigured**: `boolean`

Defined in: [src/react/useBackupAuth.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#48)

Whether this provider is configured

***

### logout()

> **logout**: () => `Promise`<`void`>

Defined in: [src/react/useBackupAuth.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#53)

Sign out of iCloud

**Returns**

`Promise`<`void`>

***

### refreshToken()

> **refreshToken**: () => `Promise`<`string` | `null`>

Defined in: [src/react/useBackupAuth.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#55)

Re-check the iCloud session and return the user record name

**Returns**

`Promise`<`string` | `null`>

## Methods

### requestAccess()

**Call Signature**

> **requestAccess**(): `Promise`<`string`>

Defined in: [src/react/useBackupAuth.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#50)

Request access - triggers iCloud sign-in if needed and returns the user record name

**Returns**

`Promise`<`string`>

**Call Signature**

> **requestAccess**(`options`: `object`): `Promise`<`string`>

Defined in: [src/react/useBackupAuth.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/react/useBackupAuth.ts#51)

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

`Promise`<`string`>
