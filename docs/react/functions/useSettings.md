# useSettings()

> **useSettings**(`options`): [`UseSettingsResult`](../interfaces/UseSettingsResult.md)

Defined in: [src/react/useSettings.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L69)

A React hook for managing user settings with automatic persistence using WatermelonDB.

This hook provides methods to get, set, and delete user model preferences,
with automatic loading of preferences when a wallet address is provided.

## Parameters

### options

[`UseSettingsOptions`](../interfaces/UseSettingsOptions.md)

Configuration options

## Returns

[`UseSettingsResult`](../interfaces/UseSettingsResult.md)

An object containing settings state and methods

## Example

```tsx
import { Database } from '@nozbe/watermelondb';
import { useSettings } from '@reverbia/sdk/react';

function SettingsComponent({ database }: { database: Database }) {
  const {
    modelPreference,
    isLoading,
    setModelPreference,
    getModelPreference,
    deleteModelPreference,
  } = useSettings({
    database,
    walletAddress: '0x123...', // Optional: auto-loads preference for this wallet
  });

  const handleModelChange = async (model: string) => {
    await setModelPreference('0x123...', model);
  };

  return (
    <div>
      <p>Current model: {modelPreference?.model ?? 'Not set'}</p>
      <button onClick={() => handleModelChange('gpt-4o')}>
        Use GPT-4o
      </button>
    </div>
  );
}
```
