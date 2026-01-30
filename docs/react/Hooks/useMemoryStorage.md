# useMemoryStorage

> **useMemoryStorage**(`options`: `object`): `BaseUseMemoryStorageResult`

Defined in: [src/react/useMemoryStorage.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useMemoryStorage.ts#L106)

A React hook that wraps useMemory with automatic memory persistence using WatermelonDB.

This hook provides all the functionality of useMemory plus automatic storage of
memories to a WatermelonDB database. Memories are automatically saved when extracted
and can be searched using semantic similarity.

## Parameters

<table>
<thead>
<tr>
<th>Parameter</th>
<th>Type</th>
<th>Description</th>
</tr>
</thead>
<tbody>
<tr>
<td>

`options`

</td>
<td>

`object`

</td>
<td>

Configuration options

</td>
</tr>
<tr>
<td>

`options.baseUrl?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.completionsModel?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.database`

</td>
<td>

`Database`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.embeddedWalletSigner?`

</td>
<td>

[`EmbeddedWalletSignerFn`](../Internal/type-aliases/EmbeddedWalletSignerFn.md)

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.embeddingModel?`

</td>
<td>

`string` | `null`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.generateEmbeddings?`

</td>
<td>

`boolean`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.getToken?`

</td>
<td>

() => `Promise`<`string` | `null`>

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.onFactsExtracted?`

</td>
<td>

(`facts`: `MemoryExtractionResult`) => `void`

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.signMessage?`

</td>
<td>

[`SignMessageFn`](../Internal/type-aliases/SignMessageFn.md)

</td>
<td>

‐

</td>
</tr>
<tr>
<td>

`options.walletAddress?`

</td>
<td>

`string`

</td>
<td>

‐

</td>
</tr>
</tbody>
</table>

## Returns

`BaseUseMemoryStorageResult`

An object containing memory state, methods, and storage operations

## Example

```tsx
import { Database } from '@nozbe/watermelondb';
import { useMemoryStorage } from '@reverbia/sdk/react';

function MemoryComponent({ database }: { database: Database }) {
  const {
    memories,
    extractMemoriesFromMessage,
    searchMemories,
    fetchAllMemories,
  } = useMemoryStorage({
    database,
    getToken: async () => getAuthToken(),
    onFactsExtracted: (facts) => console.log('Extracted:', facts),
  });

  const handleExtract = async () => {
    const result = await extractMemoriesFromMessage({
      messages: [{ role: 'user', content: 'My name is John and I live in NYC' }],
      model: 'gpt-4o-mini',
    });
  };

  return (
    <div>
      <button onClick={handleExtract}>Extract Memories</button>
      <p>Total memories: {memories.length}</p>
    </div>
  );
}
```
