# UseSettingsResult

Defined in: [src/react/useSettings.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L43)

Extended result returned by useSettings hook (React version)
Includes both legacy modelPreference API and new userPreference API

## Extends

* `BaseUseSettingsResult`

## Properties

### deleteModelPreference()

> **deleteModelPreference**: (`walletAddress`: `string`) => `Promise`<`boolean`>

Defined in: [src/lib/db/settings/types.ts:40](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L40)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

**Returns**

`Promise`<`boolean`>

**Inherited from**

`BaseUseSettingsResult.deleteModelPreference`

***

### deleteUserPreference()

> **deleteUserPreference**: (`walletAddress`: `string`) => `Promise`<`boolean`>

Defined in: [src/react/useSettings.ts:65](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L65)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

**Returns**

`Promise`<`boolean`>

***

### getModelPreference()

> **getModelPreference**: (`walletAddress`: `string`) => `Promise`<[`StoredModelPreference`](StoredModelPreference.md) | `null`>

Defined in: [src/lib/db/settings/types.ts:33](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L33)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

**Returns**

`Promise`<[`StoredModelPreference`](StoredModelPreference.md) | `null`>

**Inherited from**

`BaseUseSettingsResult.getModelPreference`

***

### getUserPreference()

> **getUserPreference**: (`walletAddress`: `string`) => `Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

Defined in: [src/react/useSettings.ts:46](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L46)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

**Returns**

`Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/lib/db/settings/types.ts:32](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L32)

**Inherited from**

`BaseUseSettingsResult.isLoading`

***

### modelPreference

> **modelPreference**: [`StoredModelPreference`](StoredModelPreference.md) | `null`

Defined in: [src/lib/db/settings/types.ts:31](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L31)

**Inherited from**

`BaseUseSettingsResult.modelPreference`

***

### setModelPreference()

> **setModelPreference**: (`walletAddress`: `string`, `models?`: `string`) => `Promise`<[`StoredModelPreference`](StoredModelPreference.md) | `null`>

Defined in: [src/lib/db/settings/types.ts:36](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L36)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |
| `models?` | `string` |

**Returns**

`Promise`<[`StoredModelPreference`](StoredModelPreference.md) | `null`>

**Inherited from**

`BaseUseSettingsResult.setModelPreference`

***

### setUserPreference()

> **setUserPreference**: (`walletAddress`: `string`, `options`: [`UpdateUserPreferenceOptions`](UpdateUserPreferenceOptions.md)) => `Promise`<[`StoredUserPreference`](StoredUserPreference.md)>

Defined in: [src/react/useSettings.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L49)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |
| `options` | [`UpdateUserPreferenceOptions`](UpdateUserPreferenceOptions.md) |

**Returns**

`Promise`<[`StoredUserPreference`](StoredUserPreference.md)>

***

### updateModels()

> **updateModels**: (`walletAddress`: `string`, `models`: `string`) => `Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

Defined in: [src/react/useSettings.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L61)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |
| `models` | `string` |

**Returns**

`Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

***

### updatePersonality()

> **updatePersonality**: (`walletAddress`: `string`, `personality`: [`PersonalitySettings`](PersonalitySettings.md)) => `Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

Defined in: [src/react/useSettings.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L57)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |
| `personality` | [`PersonalitySettings`](PersonalitySettings.md) |

**Returns**

`Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

***

### updateProfile()

> **updateProfile**: (`walletAddress`: `string`, `profile`: [`ProfileUpdate`](ProfileUpdate.md)) => `Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

Defined in: [src/react/useSettings.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L53)

**Parameters**

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |
| `profile` | [`ProfileUpdate`](ProfileUpdate.md) |

**Returns**

`Promise`<[`StoredUserPreference`](StoredUserPreference.md) | `null`>

***

### userPreference

> **userPreference**: [`StoredUserPreference`](StoredUserPreference.md) | `null`

Defined in: [src/react/useSettings.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L45)
