# UseMemoryStorageOptions

Defined in: [src/expo/useMemoryStorage.ts:48](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useMemoryStorage.ts#L48)

Options for useMemoryStorage hook (Expo version)

Uses the base options without local embedding support.
In Expo, only "api" embedding provider is supported.

## Extends

- `Omit`\<`BaseUseMemoryStorageOptions`, `"embeddingProvider"`\>

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/db/memory/types.ts:61](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L61)

#### Inherited from

`Omit.baseUrl`

***

### completionsModel?

> `optional` **completionsModel**: `string`

Defined in: [src/lib/db/memory/types.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L55)

#### Inherited from

`Omit.completionsModel`

***

### database

> **database**: `Database`

Defined in: [src/lib/db/memory/types.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L54)

#### Inherited from

`Omit.database`

***

### embeddingModel?

> `optional` **embeddingModel**: `string` \| `null`

Defined in: [src/lib/db/memory/types.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L56)

#### Inherited from

`Omit.embeddingModel`

***

### embeddingProvider?

> `optional` **embeddingProvider**: `"api"`

Defined in: [src/expo/useMemoryStorage.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useMemoryStorage.ts#L54)

The provider to use for generating embeddings
Note: In Expo, only "api" is supported (local embeddings require web APIs)

***

### generateEmbeddings?

> `optional` **generateEmbeddings**: `boolean`

Defined in: [src/lib/db/memory/types.ts:58](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L58)

#### Inherited from

`Omit.generateEmbeddings`

***

### getToken()?

> `optional` **getToken**: () => `Promise`\<`string` \| `null`\>

Defined in: [src/lib/db/memory/types.ts:60](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L60)

#### Returns

`Promise`\<`string` \| `null`\>

#### Inherited from

`Omit.getToken`

***

### onFactsExtracted()?

> `optional` **onFactsExtracted**: (`facts`) => `void`

Defined in: [src/lib/db/memory/types.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L59)

#### Parameters

##### facts

`MemoryExtractionResult`

#### Returns

`void`

#### Inherited from

`Omit.onFactsExtracted`

***

### requestEncryptionKey()?

> `optional` **requestEncryptionKey**: (`address`) => `Promise`\<`void`\>

Defined in: [src/lib/db/memory/types.ts:65](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L65)

Function to request encryption key (optional - encryption disabled if not provided)

#### Parameters

##### address

`string`

#### Returns

`Promise`\<`void`\>

#### Inherited from

`Omit.requestEncryptionKey`

***

### signMessage()?

> `optional` **signMessage**: (`message`) => `Promise`\<`string`\>

Defined in: [src/lib/db/memory/types.ts:67](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L67)

Function to sign message for migration (optional - migration disabled if not provided)

#### Parameters

##### message

`string`

#### Returns

`Promise`\<`string`\>

#### Inherited from

`Omit.signMessage`

***

### walletAddress?

> `optional` **walletAddress**: `string` \| `null`

Defined in: [src/lib/db/memory/types.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L63)

Wallet address for encryption (optional - encryption disabled if not provided)

#### Inherited from

`Omit.walletAddress`
