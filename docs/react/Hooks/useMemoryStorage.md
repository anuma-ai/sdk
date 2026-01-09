# useMemoryStorage

> **useMemoryStorage**(`options`: `object`): `BaseUseMemoryStorageResult`

Defined in: [src/react/useMemoryStorage.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useMemoryStorage.ts#L106)

A React hook that wraps useMemory with automatic memory persistence using WatermelonDB.

This hook provides all the functionality of useMemory plus automatic storage of
memories to a WatermelonDB database. Memories are automatically saved when extracted
and can be searched using semantic similarity.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | { `baseUrl?`: `string`; `completionsModel?`: `string`; `database`: `Database`; `embeddedWalletSigner?`: [`EmbeddedWalletSignerFn`](../Internal/type-aliases/EmbeddedWalletSignerFn.md); `embeddingModel?`: `string` | `null`; `generateEmbeddings?`: `boolean`; `getToken?`: () => `Promise`<`string` | `null`>; `onFactsExtracted?`: (`facts`: `MemoryExtractionResult`) => `void`; `signMessage?`: [`SignMessageFn`](../Internal/type-aliases/SignMessageFn.md); `walletAddress?`: `string`; } | Configuration options |
| `options.baseUrl?` | `string` | - |
| `options.completionsModel?` | `string` | - |
| `options.database` | `Database` | - |
| `options.embeddedWalletSigner?` | [`EmbeddedWalletSignerFn`](../Internal/type-aliases/EmbeddedWalletSignerFn.md) | - |
| `options.embeddingModel?` | `string` | `null` | - |
| `options.generateEmbeddings?` | `boolean` | - |
| `options.getToken?` | () => `Promise`<`string` | `null`> | - |
| `options.onFactsExtracted?` | (`facts`: `MemoryExtractionResult`) => `void` | - |
| `options.signMessage?` | [`SignMessageFn`](../Internal/type-aliases/SignMessageFn.md) | - |
| `options.walletAddress?` | `string` | - |

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
