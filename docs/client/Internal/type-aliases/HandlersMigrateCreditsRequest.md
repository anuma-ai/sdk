# HandlersMigrateCreditsRequest

> **HandlersMigrateCreditsRequest** = `object`

Defined in: [src/client/types.gen.ts:743](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#743)

## Properties

### batch\_size?

> `optional` **batch\_size**: `number`

Defined in: [src/client/types.gen.ts:747](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#747)

BatchSize is the number of users per on-chain transaction. Required, max 200.

***

### escrow\_contract?

> `optional` **escrow\_contract**: `string`

Defined in: [src/client/types.gen.ts:748](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#748)

***

### force?

> `optional` **force**: `boolean`

Defined in: [src/client/types.gen.ts:753](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#753)

Force resets the credits\_migrated flag for all enrolled users before migrating,
allowing re-migration (e.g., after a credits token redeployment).
