# userPreferencesStorageSchema

> `const` **userPreferencesStorageSchema**: `Readonly`<{ `tables`: `TableMap`; `unsafeSql?`: (`_`: `string`, `__`: `AppSchemaUnsafeSqlKind`) => `string`; `version`: `number`; }>

Defined in: src/lib/db/userPreferences/schema.ts:10

User preferences table schema definition.

This schema is used internally by the SDK and merged into the main sdkSchema.
It stores unified user preferences including profile data, model preferences,
and personality settings.
