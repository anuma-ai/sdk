# UseMemoryStorageOptions

Defined in: src/react/useMemoryStorage.ts:52

Options for useMemoryStorage hook (React version)

Uses the base options. React-specific features can be added here if needed.

## Extends

* `BaseUseMemoryStorageOptions`

## Properties

### baseUrl?

> `optional` **baseUrl**: `string`

Defined in: src/lib/db/memory/types.ts:64

**Inherited from**

`BaseUseMemoryStorageOptions.baseUrl`

***

### completionsModel?

> `optional` **completionsModel**: `string`

Defined in: src/lib/db/memory/types.ts:59

**Inherited from**

`BaseUseMemoryStorageOptions.completionsModel`

***

### database

> **database**: `Database`

Defined in: src/lib/db/memory/types.ts:58

**Inherited from**

`BaseUseMemoryStorageOptions.database`

***

### embeddedWalletSigner?

> `optional` **embeddedWalletSigner**: [`EmbeddedWalletSignerFn`](../type-aliases/EmbeddedWalletSignerFn.md)

Defined in: src/lib/db/memory/types.ts:67

**Inherited from**

`BaseUseMemoryStorageOptions.embeddedWalletSigner`

***

### embeddingModel?

> `optional` **embeddingModel**: `string` | `null`

Defined in: src/lib/db/memory/types.ts:60

**Inherited from**

`BaseUseMemoryStorageOptions.embeddingModel`

***

### generateEmbeddings?

> `optional` **generateEmbeddings**: `boolean`

Defined in: src/lib/db/memory/types.ts:61

**Inherited from**

`BaseUseMemoryStorageOptions.generateEmbeddings`

***

### getToken()?

> `optional` **getToken**: () => `Promise`<`string` | `null`>

Defined in: src/lib/db/memory/types.ts:63

**Returns**

`Promise`<`string` | `null`>

**Inherited from**

`BaseUseMemoryStorageOptions.getToken`

***

### onFactsExtracted()?

> `optional` **onFactsExtracted**: (`facts`: `MemoryExtractionResult`) => `void`

Defined in: src/lib/db/memory/types.ts:62

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

Defined in: src/lib/db/memory/types.ts:66

**Inherited from**

`BaseUseMemoryStorageOptions.signMessage`

***

### walletAddress?

> `optional` **walletAddress**: `string`

Defined in: src/lib/db/memory/types.ts:65

**Inherited from**

`BaseUseMemoryStorageOptions.walletAddress`
