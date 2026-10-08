# UseSettingsResult

Defined in: [src/react/useSettings.ts:47](https://github.com/anuma-ai/sdk/blob/main/src/react/useSettings.ts#47)

Extended result returned by useSettings hook (React version)
Includes both legacy modelPreference API and new userPreference API

## Extends

* `BaseUseSettingsResult`

## Properties

### deleteModelPreference()

> **deleteModelPreference**: (`walletAddress`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/settings/types.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/settings/types.ts#41)

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

Defined in: [src/react/useSettings.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/react/useSettings.ts#63)

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

Defined in: [src/lib/db/settings/types.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/settings/types.ts#36)

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

Defined in: [src/react/useSettings.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/react/useSettings.ts#49)

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

Defined in: [src/lib/db/settings/types.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/settings/types.ts#35)

**Inherited from**

`BaseUseSettingsResult.isLoading`

***

### modelPreference

> **modelPreference**: [`StoredModelPreference`](StoredModelPreference.md) | `null`

Defined in: [src/lib/db/settings/types.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/settings/types.ts#34)

**Inherited from**

`BaseUseSettingsResult.modelPreference`

***

### setModelPreference()

> **setModelPreference**: (`walletAddress`: `string`, `models?`: `string`) => `Promise`<[`StoredModelPreference`](StoredModelPreference.md) | `null`>

Defined in: [src/lib/db/settings/types.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/settings/types.ts#37)

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

Defined in: [src/react/useSettings.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/react/useSettings.ts#50)

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

Defined in: [src/react/useSettings.ts:62](https://github.com/anuma-ai/sdk/blob/main/src/react/useSettings.ts#62)

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

Defined in: [src/react/useSettings.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/react/useSettings.ts#58)

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

Defined in: [src/react/useSettings.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/react/useSettings.ts#54)

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

Defined in: [src/react/useSettings.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/react/useSettings.ts#48)
