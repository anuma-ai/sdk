# useMemoryStorage()

> **useMemoryStorage**(`options`): `BaseUseMemoryStorageResult`

Defined in: [src/expo/useMemoryStorage.ts:151](https://github.com/zeta-chain/ai-sdk/blob/main/src/expo/useMemoryStorage.ts#L151)

A React hook that wraps useMemory with automatic memory persistence using WatermelonDB.

**Expo/React Native version** - This is a lightweight version that only supports
API-based embeddings. Local embeddings require web APIs not available in React Native.

## Parameters

### options

`BaseUseMemoryStorageOptions`

Configuration options

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
