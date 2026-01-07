# UseSettingsResult

Defined in: [src/react/useSettings.ts:42](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L42)

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

Defined in: [src/react/useSettings.ts:64](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L64)

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

Defined in: [src/react/useSettings.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L45)

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

Defined in: [src/react/useSettings.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L48)

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

Defined in: [src/react/useSettings.ts:60](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L60)

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

Defined in: [src/react/useSettings.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L56)

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

Defined in: [src/react/useSettings.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L52)

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

Defined in: [src/react/useSettings.ts:44](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L44)
