# useMemoryStorage

> **useMemoryStorage**(`options`: `object`): `BaseUseMemoryStorageResult`

Defined in: [src/expo/useMemoryStorage.ts:152](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useMemoryStorage.ts#L152)

A React hook that wraps useMemory with automatic memory persistence using WatermelonDB.

**Expo/React Native version** - This is a lightweight version that only supports
API-based embeddings. Local embeddings require web APIs not available in React Native.

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

[`EmbeddedWalletSignerFn`](../../react/Internal/type-aliases/EmbeddedWalletSignerFn.md)

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

[`SignMessageFn`](../../react/Internal/type-aliases/SignMessageFn.md)

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
import { useMemoryStorage } from '@anuma/sdk/expo';

function MemoryScreen({ database }: { database: Database }) {
  const {
    memories,
    extractMemoriesFromMessage,
    searchMemories,
  } = useMemoryStorage({
    database,
    getToken: async () => getAuthToken(),
  });

  const handleExtract = async () => {
    await extractMemoriesFromMessage({
      messages: [{ role: 'user', content: 'My name is John' }],
    });
  };

  return (
    <View>
      <Button onPress={handleExtract} title="Extract" />
      <Text>Memories: {memories.length}</Text>
    </View>
  );
}
```
