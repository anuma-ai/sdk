# HandlersWipePrivyDevUsersRequest

> **HandlersWipePrivyDevUsersRequest** = `object`

Defined in: [src/client/types.gen.ts:3112](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3112)

## Properties

### dry\_run?

> `optional` **dry\_run**: `boolean`

Defined in: [src/client/types.gen.ts:3117](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3117)

DryRun, when true, lists the target users (and whether a portal account
matches) without calling any DELETE endpoint.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:3122](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3122)

Limit caps the number of Privy users to delete this run. Defaults to 50
when zero, capped at 200.
