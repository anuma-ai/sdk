# useMemoryStorage

> **useMemoryStorage**(`options`: `object`): `BaseUseMemoryStorageResult`

Defined in: [src/expo/useMemoryStorage.ts:152](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useMemoryStorage.ts#L152)

A React hook that wraps useMemory with automatic memory persistence using WatermelonDB.

**Expo/React Native version** - This is a lightweight version that only supports
API-based embeddings. Local embeddings require web APIs not available in React Native.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | { `baseUrl?`: `string`; `completionsModel?`: `string`; `database`: `Database`; `embeddedWalletSigner?`: [`EmbeddedWalletSignerFn`](../../react/Internal/type-aliases/EmbeddedWalletSignerFn.md); `embeddingModel?`: `string` | `null`; `generateEmbeddings?`: `boolean`; `getToken?`: () => `Promise`<`string` | `null`>; `onFactsExtracted?`: (`facts`: `MemoryExtractionResult`) => `void`; `signMessage?`: [`SignMessageFn`](../../react/Internal/type-aliases/SignMessageFn.md); `walletAddress?`: `string`; } | Configuration options |
| `options.baseUrl?` | `string` | - |
| `options.completionsModel?` | `string` | - |
| `options.database` | `Database` | - |
| `options.embeddedWalletSigner?` | [`EmbeddedWalletSignerFn`](../../react/Internal/type-aliases/EmbeddedWalletSignerFn.md) | - |
| `options.embeddingModel?` | `string` | `null` | - |
| `options.generateEmbeddings?` | `boolean` | - |
| `options.getToken?` | () => `Promise`<`string` | `null`> | - |
| `options.onFactsExtracted?` | (`facts`: `MemoryExtractionResult`) => `void` | - |
| `options.signMessage?` | [`SignMessageFn`](../../react/Internal/type-aliases/SignMessageFn.md) | - |
| `options.walletAddress?` | `string` | - |

## Returns

`BaseUseMemoryStorageResult`

An object containing memory state, methods, and storage operations

## Example

```tsx
import { Database } from '@nozbe/watermelondb';
import { useMemoryStorage } from '@reverbia/sdk/expo';

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
