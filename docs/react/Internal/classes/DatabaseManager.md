# DatabaseManager

Defined in: [src/lib/db/manager.ts:153](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L153)

Manages per-wallet WatermelonDB database instances.

Each wallet address gets its own isolated database. The manager handles:

* Singleton caching per wallet
* Automatic database switching when the wallet changes
* Destructive schema migration detection and handling
* Per-wallet storage key namespacing

## Example

```typescript
import { DatabaseManager, webPlatformStorage, sdkSchema, sdkMigrations } from '@reverbia/sdk/react';
import LokiJSAdapter from '@nozbe/watermelondb/adapters/lokijs';

const dbManager = new DatabaseManager({
  dbNamePrefix: 'my-app',
  createAdapter: (dbName, schema, migrations) => new LokiJSAdapter({
    schema,
    migrations,
    dbName,
    useWebWorker: false,
    useIncrementalIndexedDB: true,
  }),
  storage: webPlatformStorage,
  onDestructiveMigration: () => window.location.reload(),
});

// Get the database for the current wallet
const database = dbManager.getDatabase(walletAddress);
```

## Constructors

### Constructor

> **new DatabaseManager**(`options`: [`DatabaseManagerOptions`](../interfaces/DatabaseManagerOptions.md)): `DatabaseManager`

Defined in: [src/lib/db/manager.ts:164](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L164)

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

`options`

</td>
<td>

[`DatabaseManagerOptions`](../interfaces/DatabaseManagerOptions.md)

</td>
</tr>
</tbody>
</table>

**Returns**

`DatabaseManager`

## Methods

### getDatabase()

> **getDatabase**(`walletAddress?`: `string`): `Database`

Defined in: [src/lib/db/manager.ts:190](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L190)

Get or create a WatermelonDB Database instance for the given wallet.

If the wallet address has changed since the last call, the previous
database instance is discarded and a new one is created.

**Parameters**

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

`walletAddress?`

</td>
<td>

`string`

</td>
<td>

The wallet address to scope the database to.
If undefined, uses a "guest" database.

</td>
</tr>
</tbody>
</table>

**Returns**

`Database`

The WatermelonDB Database instance

**Throws**

If a destructive migration is in progress

***

### getDbName()

> **getDbName**(`walletAddress?`: `string`): `string`

Defined in: [src/lib/db/manager.ts:175](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L175)

Get the database name for a given wallet address.

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

`walletAddress?`

</td>
<td>

`string`

</td>
</tr>
</tbody>
</table>

**Returns**

`string`

***

### resetDatabase()

> **resetDatabase**(): `Promise`<`void`>

Defined in: [src/lib/db/manager.ts:233](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L233)

Reset the current database (useful for logout or testing).

**Returns**

`Promise`<`void`>
