# sdkModelClasses

> `const` **sdkModelClasses**: `Class`<`Model`>\[]

Defined in: [src/lib/db/schema.ts:415](https://github.com/zeta-chain/ai-sdk/blob/main/src/lib/db/schema.ts#L415)

Model classes to register with the WatermelonDB database.

Pass this array directly to the `modelClasses` option when creating
your Database instance.

## Example

```typescript
import { Database } from '@nozbe/watermelondb';
import { sdkSchema, sdkMigrations, sdkModelClasses } from '@reverbia/sdk/react';

const database = new Database({
  adapter,
  modelClasses: sdkModelClasses,
});
```
