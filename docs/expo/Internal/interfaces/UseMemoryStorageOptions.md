# UseMemoryStorageOptions

Defined in: [src/expo/useMemoryStorage.ts:43](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useMemoryStorage.ts#L43)

Options for useMemoryStorage hook (Expo version)

Uses the base options.

## Extends

* `BaseUseMemoryStorageOptions`

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/db/memory/types.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L56)

**Inherited from**

`BaseUseMemoryStorageOptions.baseUrl`

***

### completionsModel?

> `optional` **completionsModel**: `string`

Defined in: [src/lib/db/memory/types.ts:51](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L51)

**Inherited from**

`BaseUseMemoryStorageOptions.completionsModel`

***

### database

> **database**: `Database`

Defined in: [src/lib/db/memory/types.ts:50](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L50)

**Inherited from**

`BaseUseMemoryStorageOptions.database`

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../../../react/Internal/type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/memory/types.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L59)

**Inherited from**

`BaseUseMemoryStorageOptions.embeddedWalletSigner`

***

### embeddingModel?

> `optional` **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memory/types.ts:52](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L52)

**Inherited from**

`BaseUseMemoryStorageOptions.embeddingModel`

***

### generateEmbeddings?

> `optional` **generateEmbeddings**: `boolean`

Defined in: [src/lib/db/memory/types.ts:53](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L53)

**Inherited from**

`BaseUseMemoryStorageOptions.generateEmbeddings`

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/db/memory/types.ts:55](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L55)

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

`BaseUseMemoryStorageOptions.getToken`

***

### onFactsExtracted()?

> `optional` **onFactsExtracted**: (`facts`: `MemoryExtractionResult`) => `void`

Defined in: [src/lib/db/memory/types.ts:54](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L54)

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

`facts`

</td>
<td>

`MemoryExtractionResult`

</td>
</tr>
</tbody>
</table>

**Returns**

`void`

**Inherited from**

`BaseUseMemoryStorageOptions.onFactsExtracted`

***

### signMessage?

> `optional` **signMessage**: [`SignMessageFn`](../../../react/Internal/type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/memory/types.ts:58](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L58)

**Inherited from**

`BaseUseMemoryStorageOptions.signMessage`

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/memory/types.ts:57](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L57)

**Inherited from**

`BaseUseMemoryStorageOptions.walletAddress`
