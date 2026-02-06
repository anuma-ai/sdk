# DatabaseManagerOptions

Defined in: [src/lib/db/manager.ts:45](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L45)

Configuration options for DatabaseManager.

## Properties

### createAdapter()

> **createAdapter**: (`dbName`: `string`, `schema`: `Readonly`<{ `tables`: `TableMap`; `unsafeSql?`: (`_`: `string`, `__`: `AppSchemaUnsafeSqlKind`) => `string`; `version`: `number`; }>, `migrations`: `Readonly`<{ `maxVersion`: `number`; `minVersion`: `number`; `sortedMigrations`: `Readonly`<{ `steps`: `MigrationStep`\[]; `toVersion`: `number`; }>\[]; `validated`: `true`; }>) => `DatabaseAdapter`

Defined in: [src/lib/db/manager.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L63)

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

Defined in: [src/lib/db/manager.ts:47](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L47)

Prefix for database names, e.g. "anuma-watermelon". Each wallet gets `{prefix}-{address}`.

***

### logger?

> `optional` **logger**: [`DatabaseManagerLogger`](DatabaseManagerLogger.md)

Defined in: [src/lib/db/manager.ts:77](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L77)

Optional logger for debug/warn/info messages

***

### onDestructiveMigration()?

> `optional` **onDestructiveMigration**: () => `void`

Defined in: [src/lib/db/manager.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L75)

Called when a destructive migration is needed (schema too old).
On web, this typically triggers `window.location.reload()`.
If not provided, the manager will throw an error instead.

**Returns**

`void`

***

### storage?

> `optional` **storage**: [`PlatformStorage`](PlatformStorage.md)

Defined in: [src/lib/db/manager.ts:69](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/manager.ts#L69)

Platform storage implementation. Defaults to webPlatformStorage.
