# HandlersWipePrivyDevUsersRequest

> **HandlersWipePrivyDevUsersRequest** = `object`

Defined in: [src/client/types.gen.ts:2942](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2942)

## Properties

### dry\_run?

> `optional` **dry\_run**: `boolean`

Defined in: [src/client/types.gen.ts:2947](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2947)

DryRun, when true, lists the target users (and whether a portal account
matches) without calling any DELETE endpoint.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:2952](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2952)

Limit caps the number of Privy users to delete this run. Defaults to 50
when zero, capped at 200.
