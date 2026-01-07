# useSettings()

> **useSettings**(`options`: [`UseSettingsOptions`](../interfaces/UseSettingsOptions.md)): [`UseSettingsResult`](../interfaces/UseSettingsResult.md)

Defined in: [src/react/useSettings.ts:115](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L115)

A React hook for managing user settings with automatic persistence using WatermelonDB.

This hook provides methods to get, set, and delete user preferences,
with automatic loading and migration when a wallet address is provided.

The hook supports both the legacy `modelPreference` API (deprecated) and
the new unified `userPreference` API that stores profile data, model preferences,
and personality settings in a single table.

## Parameters

| Parameter | Type | Description |
| ------ | ------ | ------ |
| `options` | [`UseSettingsOptions`](../interfaces/UseSettingsOptions.md) | Configuration options |

## Returns

[`UseSettingsResult`](../interfaces/UseSettingsResult.md)

An object containing settings state and methods

## Example

```tsx
import { Database } from '@nozbe/watermelondb';
import { useSettings } from '@reverbia/sdk/react';

function SettingsComponent({ database }: { database: Database }) {
  const {
    userPreference,
    isLoading,
    setUserPreference,
    updateProfile,
    updatePersonality,
  } = useSettings({
    database,
    walletAddress: '0x123...', // Auto-loads and migrates preference
  });

  const handleProfileUpdate = async () => {
    await updateProfile('0x123...', {
      nickname: 'John',
      occupation: 'Developer',
    });
  };

  return (
    <div>
      <p>Nickname: {userPreference?.nickname ?? 'Not set'}</p>
      <button onClick={handleProfileUpdate}>Update Profile</button>
    </div>
  );
}
```
