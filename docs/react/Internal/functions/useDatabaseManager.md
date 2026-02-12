# useDatabaseManager

> **useDatabaseManager**(`walletAddress`: `string` | `undefined`, `manager`: [`DatabaseManager`](../classes/DatabaseManager.md)): `Database`

Defined in: [src/react/useDatabaseManager.ts:49](https://github.com/zeta-chain/ai-sdk/blob/main/src/react/useDatabaseManager.ts#L49)

React hook that returns the correct WatermelonDB Database instance
for the current wallet address.

Replaces the common pattern of:

```typescript
const database = useMemo(() => getWatermelonDatabase(walletAddress), [walletAddress]);
```

When the wallet address changes, a new database instance is returned,
providing complete per-wallet data isolation.

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

`walletAddress`

</td>
<td>

`string` | `undefined`

</td>
<td>

The current user's wallet address, or undefined for guest mode

</td>
</tr>
<tr>
<td>

`manager`

</td>
<td>

[`DatabaseManager`](../classes/DatabaseManager.md)

</td>
<td>

A DatabaseManager instance (should be created once at app level)

</td>
</tr>
</tbody>
</table>

## Returns

`Database`

The WatermelonDB Database instance for the current wallet

## Example

```tsx
import { useDatabaseManager, DatabaseManager, webPlatformStorage } from '@anuma/sdk/react';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

// Create once at app level
const dbManager = new DatabaseManager({
  dbNamePrefix: 'my-app',
  createAdapter: (dbName, schema, migrations) => new LokiJSAdapter({
    schema, migrations, dbName,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
  }),
  storage: webPlatformStorage,
  onDestructiveMigration: () => window.location.reload(),
});

function MyComponent() {
  const { user } = usePrivy();
  const database = useDatabaseManager(user?.wallet?.address, dbManager);

  // Pass database to SDK hooks
  const { sendMessage } = useChatStorage({ database, ... });
}
```
