# UseMemoryStorageOptions

Defined in: [src/expo/useMemoryStorage.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useMemoryStorage.ts#L50)

Options for useMemoryStorage hook (Expo version)

Uses the base options without local embedding support.
In Expo, only "api" embedding provider is supported.

## Extends

- `Omit`\<`BaseUseMemoryStorageOptions`, `"embeddingProvider"`\>

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/memoryStorage/types.ts:156](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L156)

Optional base URL for the API requests

#### Inherited from

`Omit.baseUrl`

***

### completionsModel?

> `optional` **completionsModel**: `string`

Defined in: [src/lib/memoryStorage/types.ts:135](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L135)

The model to use for fact extraction (default: "openai/gpt-4o")

#### Inherited from

`Omit.completionsModel`

***

### database

> **database**: `Database`

Defined in: [src/lib/memoryStorage/types.ts:133](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L133)

WatermelonDB database instance

#### Inherited from

`Omit.database`

***

### embeddingModel?

> `optional` **embeddingModel**: `string` \| `null`

Defined in: [src/lib/memoryStorage/types.ts:142](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L142)

The model to use for generating embeddings
For local: default is "Snowflake/snowflake-arctic-embed-xs"
For api: default is "openai/text-embedding-3-small"
Set to null to disable embedding generation

#### Inherited from

`Omit.embeddingModel`

***

### embeddingProvider?

> `optional` **embeddingProvider**: `"api"`

Defined in: [src/expo/useMemoryStorage.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useMemoryStorage.ts#L56)

The provider to use for generating embeddings
Note: In Expo, only "api" is supported (local embeddings require web APIs)

***

### generateEmbeddings?

> `optional` **generateEmbeddings**: `boolean`

Defined in: [src/lib/memoryStorage/types.ts:150](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L150)

Whether to automatically generate embeddings for extracted memories (default: true)

#### Inherited from

`Omit.generateEmbeddings`

***

### getToken()?

> `optional` **getToken**: () => `Promise`\<`string` \| `null`\>

Defined in: [src/lib/memoryStorage/types.ts:154](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L154)

Custom function to get auth token for API calls

#### Returns

`Promise`\<`string` \| `null`\>

#### Inherited from

`Omit.getToken`

***

### onFactsExtracted()?

> `optional` **onFactsExtracted**: (`facts`) => `void`

Defined in: [src/lib/memoryStorage/types.ts:152](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/memoryStorage/types.ts#L152)

Callback when facts are extracted

#### Parameters

##### facts

`MemoryExtractionResult`

#### Returns

`void`

#### Inherited from

`Omit.onFactsExtracted`
