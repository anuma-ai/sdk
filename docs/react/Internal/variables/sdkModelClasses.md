# sdkModelClasses

> `const` **sdkModelClasses**: `Class`<`Model`>\[]

Defined in: [src/lib/db/schema.ts:504](https://github.com/anuma-ai/sdk/blob/main/src/lib/db/schema.ts#504)

Model classes to register with the WatermelonDB database.

Pass this array directly to the `modelClasses` option when creating
your Database instance.

## Example

```typescript
import { Database } from '@nozbe/watermelondb';
import { sdkSchema, sdkMigrations, sdkModelClasses } from '@anuma/sdk/react';

const database = new Database({
  adapter,
  modelClasses: sdkModelClasses,
});
```
