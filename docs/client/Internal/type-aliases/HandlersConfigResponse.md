# HandlersConfigResponse

> **HandlersConfigResponse** = `object`

Defined in: [src/client/types.gen.ts:158](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#158)

## Properties

### apps?

> `optional` **apps**: [`HandlersAppConfig`](HandlersAppConfig.md)\[]

Defined in: [src/client/types.gen.ts:162](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#162)

Apps is the list of active apps with their escrow contracts

***

### chain\_id?

> `optional` **chain\_id**: `string`

Defined in: [src/client/types.gen.ts:166](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#166)

ChainID is the blockchain chain ID

***

### operator\_address?

> `optional` **operator\_address**: `string`

Defined in: [src/client/types.gen.ts:170](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#170)

OperatorAddress is the operator wallet address

***

### settlement\_recipient?

> `optional` **settlement\_recipient**: `string`

Defined in: [src/client/types.gen.ts:174](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#174)

SettlementRecipient is the address that receives settlement payments
