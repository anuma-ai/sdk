# UseSettingsResult

Defined in: src/react/useSettings.ts:43

Extended result returned by useSettings hook (React version)
Includes both legacy modelPreference API and new userPreference API

## Extends

* `BaseUseSettingsResult`

## Properties

### deleteModelPreference()

> **deleteModelPreference**: (`walletAddress`: `string`) => `Promise`<`boolean`>

Defined in: src/lib/db/settings/types.ts:40

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

**Inherited from**

`BaseUseSettingsResult.deleteModelPreference`

***

### deleteUserPreference()

> **deleteUserPreference**: (`walletAddress`: `string`) => `Promise`<`boolean`>

Defined in: src/react/useSettings.ts:65

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<`boolean`>

***

### getModelPreference()

> **getModelPreference**: (`walletAddress`: `string`) => `Promise`<[`StoredModelPreference`](StoredModelPreference.md) | `null`>

Defined in: src/lib/db/settings/types.ts:33

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredModelPreference`](StoredModelPreference.md) | `null`>

**Inherited from**

`BaseUseSettingsResult.getModelPreference`

***

### getUserPreference()

> **getUserPreference**: (`walletAddress`: `string`) => `Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

Defined in: src/react/useSettings.ts:46

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

***

### isLoading

> **isLoading**: `boolean`

Defined in: src/lib/db/settings/types.ts:32

**Inherited from**

`BaseUseSettingsResult.isLoading`

***

### modelPreference

> **modelPreference**: [`StoredModelPreference`](StoredModelPreference.md) | `null`

Defined in: src/lib/db/settings/types.ts:31

**Inherited from**

`BaseUseSettingsResult.modelPreference`

***

### setModelPreference()

> **setModelPreference**: (`walletAddress`: `string`, `models?`: `string`) => `Promise`<[`StoredModelPreference`](StoredModelPreference.md) | `null`>

Defined in: src/lib/db/settings/types.ts:36

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`models?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredModelPreference`](StoredModelPreference.md) | `null`>

**Inherited from**

`BaseUseSettingsResult.setModelPreference`

***

### setUserPreference()

> **setUserPreference**: (`walletAddress`: `string`, `options`: [`UpdateUserPreferenceOptions`](UpdateUserPreferenceOptions.md)) => `Promise`<[`StoredUserPreference`](StoredUserPreference.md)>

Defined in: src/react/useSettings.ts:49

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`options`

</td>
<td>

[`UpdateUserPreferenceOptions`](UpdateUserPreferenceOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredUserPreference`](StoredUserPreference.md)>

***

### updateModels()

> **updateModels**: (`walletAddress`: `string`, `models`: `string`) => `Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

Defined in: src/react/useSettings.ts:61

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`models`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

***

### updatePersonality()

> **updatePersonality**: (`walletAddress`: `string`, `personality`: [`PersonalitySettings`](PersonalitySettings.md)) => `Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

Defined in: src/react/useSettings.ts:57

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`personality`

</td>
<td>

[`PersonalitySettings`](PersonalitySettings.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

***

### updateProfile()

> **updateProfile**: (`walletAddress`: `string`, `profile`: [`ProfileUpdate`](ProfileUpdate.md)) => `Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

Defined in: src/react/useSettings.ts:53

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

`walletAddress`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`profile`

</td>
<td>

[`ProfileUpdate`](ProfileUpdate.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

***

### userPreference

> **userPreference**: [`StoredUserPreference`](StoredUserPreference.md) | `null`

Defined in: src/react/useSettings.ts:45
