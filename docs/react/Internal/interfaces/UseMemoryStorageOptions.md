# UseMemoryStorageOptions

Defined in: [src/react/useMemoryStorage.ts:56](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useMemoryStorage.ts#L56)

Options for useMemoryStorage hook (React version)

Uses the base options. React-specific features can be added here if needed.

## Extends

* `BaseUseMemoryStorageOptions`

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: [src/lib/db/memory/types.ts:80](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L80)

**Inherited from**

`BaseUseMemoryStorageOptions.baseUrl`

***

### completionsModel?

> `optional` **completionsModel**: `string`

Defined in: [src/lib/db/memory/types.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L75)

**Inherited from**

`BaseUseMemoryStorageOptions.completionsModel`

***

### database

> **database**: `Database`

Defined in: [src/lib/db/memory/types.ts:74](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L74)

**Inherited from**

`BaseUseMemoryStorageOptions.database`

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: [src/lib/db/memory/types.ts:83](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L83)

**Inherited from**

`BaseUseMemoryStorageOptions.embeddedWalletSigner`

***

### embeddingModel?

> `optional` **embeddingModel**: `string` | `null`

Defined in: [src/lib/db/memory/types.ts:76](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L76)

**Inherited from**

`BaseUseMemoryStorageOptions.embeddingModel`

***

### generateEmbeddings?

> `optional` **generateEmbeddings**: `boolean`

Defined in: [src/lib/db/memory/types.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L77)

**Inherited from**

`BaseUseMemoryStorageOptions.generateEmbeddings`

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: [src/lib/db/memory/types.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L79)

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

`BaseUseMemoryStorageOptions.getToken`

***

### onFactsExtracted()?

> `optional` **onFactsExtracted**: (`facts`: `MemoryExtractionResult`) => `void`

Defined in: [src/lib/db/memory/types.ts:78](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L78)

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

> `optional` **signMessage**: [`SignMessageFn`](../type-aliases/SignMessageFn.md)

Defined in: [src/lib/db/memory/types.ts:82](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L82)

**Inherited from**

`BaseUseMemoryStorageOptions.signMessage`

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: [src/lib/db/memory/types.ts:81](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/memory/types.ts#L81)

**Inherited from**

`BaseUseMemoryStorageOptions.walletAddress`
