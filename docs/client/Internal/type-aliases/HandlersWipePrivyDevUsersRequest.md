# HandlersWipePrivyDevUsersRequest

> **HandlersWipePrivyDevUsersRequest** = `object`

Defined in: [src/client/types.gen.ts:3165](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3165)

## Properties

### dry\_run?

> `optional` **dry\_run**: `boolean`

Defined in: [src/client/types.gen.ts:3170](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3170)

DryRun, when true, lists the target users (and whether a portal account
matches) without calling any DELETE endpoint.

***

### limit?

> `optional` **limit**: `number`

Defined in: [src/client/types.gen.ts:3175](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3175)

Limit caps the number of Privy users to delete this run. Defaults to 50
when zero, capped at 200.
