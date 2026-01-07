# UseSettingsResult

Defined in: [src/react/useSettings.ts:41](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L41)

Extended result returned by useSettings hook (React version)
Includes both legacy modelPreference API and new userPreference API

## Extends

- `BaseUseSettingsResult`

## Properties

### deleteModelPreference()

> **deleteModelPreference**: (`walletAddress`: `string`) => `Promise`\<`boolean`\>

Defined in: [src/lib/db/settings/types.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L37)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

`BaseUseSettingsResult.deleteModelPreference`

***

### deleteUserPreference()

> **deleteUserPreference**: (`walletAddress`: `string`) => `Promise`\<`boolean`\>

Defined in: [src/react/useSettings.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L63)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

#### Returns

`Promise`\<`boolean`\>

***

### getModelPreference()

> **getModelPreference**: (`walletAddress`: `string`) => `Promise`\<[`StoredModelPreference`](StoredModelPreference.md) \| `null`\>

Defined in: [src/lib/db/settings/types.ts:30](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L30)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

#### Returns

`Promise`\<[`StoredModelPreference`](StoredModelPreference.md) \| `null`\>

#### Inherited from

`BaseUseSettingsResult.getModelPreference`

***

### getUserPreference()

> **getUserPreference**: (`walletAddress`: `string`) => `Promise`\<[`StoredUserPreference`](StoredUserPreference.md) \| `null`\>

Defined in: [src/react/useSettings.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L44)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |

#### Returns

`Promise`\<[`StoredUserPreference`](StoredUserPreference.md) \| `null`\>

***

### isLoading

> **isLoading**: `boolean`

Defined in: [src/lib/db/settings/types.ts:29](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L29)

#### Inherited from

`BaseUseSettingsResult.isLoading`

***

### modelPreference

> **modelPreference**: [`StoredModelPreference`](StoredModelPreference.md) \| `null`

Defined in: [src/lib/db/settings/types.ts:28](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L28)

#### Inherited from

`BaseUseSettingsResult.modelPreference`

***

### setModelPreference()

> **setModelPreference**: (`walletAddress`: `string`, `models?`: `string`) => `Promise`\<[`StoredModelPreference`](StoredModelPreference.md) \| `null`\>

Defined in: [src/lib/db/settings/types.ts:33](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L33)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |
| `models?` | `string` |

#### Returns

`Promise`\<[`StoredModelPreference`](StoredModelPreference.md) \| `null`\>

#### Inherited from

`BaseUseSettingsResult.setModelPreference`

***

### setUserPreference()

> **setUserPreference**: (`walletAddress`: `string`, `options`: [`UpdateUserPreferenceOptions`](UpdateUserPreferenceOptions.md)) => `Promise`\<[`StoredUserPreference`](StoredUserPreference.md)\>

Defined in: [src/react/useSettings.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L47)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |
| `options` | [`UpdateUserPreferenceOptions`](UpdateUserPreferenceOptions.md) |

#### Returns

`Promise`\<[`StoredUserPreference`](StoredUserPreference.md)\>

***

### updateModels()

> **updateModels**: (`walletAddress`: `string`, `models`: `string`) => `Promise`\<[`StoredUserPreference`](StoredUserPreference.md) \| `null`\>

Defined in: [src/react/useSettings.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L59)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |
| `models` | `string` |

#### Returns

`Promise`\<[`StoredUserPreference`](StoredUserPreference.md) \| `null`\>

***

### updatePersonality()

> **updatePersonality**: (`walletAddress`: `string`, `personality`: [`PersonalitySettings`](PersonalitySettings.md)) => `Promise`\<[`StoredUserPreference`](StoredUserPreference.md) \| `null`\>

Defined in: [src/react/useSettings.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L55)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |
| `personality` | [`PersonalitySettings`](PersonalitySettings.md) |

#### Returns

`Promise`\<[`StoredUserPreference`](StoredUserPreference.md) \| `null`\>

***

### updateProfile()

> **updateProfile**: (`walletAddress`: `string`, `profile`: [`ProfileUpdate`](ProfileUpdate.md)) => `Promise`\<[`StoredUserPreference`](StoredUserPreference.md) \| `null`\>

Defined in: [src/react/useSettings.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L51)

#### Parameters

| Parameter | Type |
| ------ | ------ |
| `walletAddress` | `string` |
| `profile` | [`ProfileUpdate`](ProfileUpdate.md) |

#### Returns

`Promise`\<[`StoredUserPreference`](StoredUserPreference.md) \| `null`\>

***

### userPreference

> **userPreference**: [`StoredUserPreference`](StoredUserPreference.md) \| `null`

Defined in: [src/react/useSettings.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L43)
