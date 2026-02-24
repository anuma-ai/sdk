# DatabaseManagerOptions

Defined in: [src/lib/db/manager.ts:46](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/manager.ts#46)

Configuration options for DatabaseManager.

## Properties

### createAdapter()

> **createAdapter**: (`dbName`: `string`, `schema`: `Readonly`<{ `tables`: `TableMap`; `unsafeSql?`: (`_`: `string`, `__`: `AppSchemaUnsafeSqlKind`) => `string`; `version`: `number`; }>, `migrations`: `Readonly`<{ `maxVersion`: `number`; `minVersion`: `number`; `sortedMigrations`: `Readonly`<{ `steps`: `MigrationStep`\[]; `toVersion`: `number`; }>\[]; `validated`: `true`; }>) => `DatabaseAdapter`

Defined in: [src/lib/db/manager.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/manager.ts#64)

Factory that creates a WatermelonDB adapter for a given database name.
The schema and migrations are provided for convenience.

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

`dbName`

</td>
<td>

`string`

</td>
</tr>
<tr>
<td>

`schema`

</td>
<td>

`Readonly`<{ `tables`: `TableMap`; `unsafeSql?`: (`_`: `string`, `__`: `AppSchemaUnsafeSqlKind`) => `string`; `version`: `number`; }>

</td>
</tr>
<tr>
<td>

`migrations`

</td>
<td>

`Readonly`<{ `maxVersion`: `number`; `minVersion`: `number`; `sortedMigrations`: `Readonly`<{ `steps`: `MigrationStep`\[]; `toVersion`: `number`; }>\[]; `validated`: `true`; }>

</td>
</tr>
</tbody>
</table>

**Returns**

`DatabaseAdapter`

**Example**

```typescript
createAdapter: (dbName, schema, migrations) => new LokiJSAdapter({
  schema,
  migrations,
  dbName,
  useWebWorker: false,
  useIncrementalIndexedDB: true,
})
```

***

### dbNamePrefix

> **dbNamePrefix**: `string`

Defined in: [src/lib/db/manager.ts:48](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/manager.ts#48)

Prefix for database names, e.g. "anuma-watermelon". Each wallet gets `{prefix}-{address}`.

***

### logger?

> `optional` **logger**: [`DatabaseManagerLogger`](DatabaseManagerLogger.md)

Defined in: [src/lib/db/manager.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/manager.ts#78)

Optional logger for debug/warn/info messages

***

### onDestructiveMigration()?

> `optional` **onDestructiveMigration**: () => `void`

Defined in: [src/lib/db/manager.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/manager.ts#76)

Called when a destructive migration is needed (schema too old).
On web, this typically triggers `window.location.reload()`.
If not provided, the manager will throw an error instead.

**Returns**

`void`

***

### storage?

> `optional` **storage**: [`PlatformStorage`](PlatformStorage.md)

Defined in: [src/lib/db/manager.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/manager.ts#70)

Platform storage implementation. Defaults to webPlatformStorage.
