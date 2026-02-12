# useSettings

> **useSettings**(`options`: `object`): [`UseSettingsResult`](../Internal/interfaces/UseSettingsResult.md)

Defined in: [src/react/useSettings.ts:116](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useSettings.ts#L116)

A React hook for managing user settings with automatic persistence using WatermelonDB.

This hook provides methods to get, set, and delete user preferences,
with automatic loading and migration when a wallet address is provided.

The hook supports both the legacy `modelPreference` API (deprecated) and
the new unified `userPreference` API that stores profile data, model preferences,
and personality settings in a single table.

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

[`UseSettingsResult`](../Internal/interfaces/UseSettingsResult.md)

An object containing settings state and methods

## Example

```tsx
import { Database } from '@nozbe/watermelondb';
import { useSettings } from '@anuma/sdk/react';

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
