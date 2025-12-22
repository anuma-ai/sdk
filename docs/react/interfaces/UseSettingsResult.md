# UseSettingsResult

Defined in: [src/react/useSettings.ts:24](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L24)

Result returned by useSettings hook (React version)

## Extends

- `BaseUseSettingsResult`

## Properties

### deleteModelPreference()

> **deleteModelPreference**: (`walletAddress`) => `Promise`\<`boolean`\>

Defined in: [src/lib/db/settings/types.ts:37](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L37)

#### Parameters

##### walletAddress

`string`

#### Returns

`Promise`\<`boolean`\>

#### Inherited from

`BaseUseSettingsResult.deleteModelPreference`

***

### getModelPreference()

> **getModelPreference**: (`walletAddress`) => `Promise`\<[`StoredModelPreference`](StoredModelPreference.md) \| `null`\>

Defined in: [src/lib/db/settings/types.ts:30](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L30)

#### Parameters

##### walletAddress

`string`

#### Returns

`Promise`\<[`StoredModelPreference`](StoredModelPreference.md) \| `null`\>

#### Inherited from

`BaseUseSettingsResult.getModelPreference`

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

> **setModelPreference**: (`walletAddress`, `models?`) => `Promise`\<[`StoredModelPreference`](StoredModelPreference.md) \| `null`\>

Defined in: [src/lib/db/settings/types.ts:33](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/settings/types.ts#L33)

#### Parameters

##### walletAddress

`string`

##### models?

`string`

#### Returns

`Promise`\<[`StoredModelPreference`](StoredModelPreference.md) \| `null`\>

#### Inherited from

`BaseUseSettingsResult.setModelPreference`
