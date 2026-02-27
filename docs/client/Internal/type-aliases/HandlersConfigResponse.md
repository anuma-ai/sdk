# HandlersConfigResponse

> **HandlersConfigResponse** = `object`

Defined in: [src/client/types.gen.ts:143](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#143)

## Properties

### apps?

> `optional` **apps**: [`HandlersAppConfig`](HandlersAppConfig.md)\[]

Defined in: [src/client/types.gen.ts:147](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#147)

Apps is the list of active apps with their escrow contracts

***

### chain\_id?

> `optional` **chain\_id**: `string`

Defined in: [src/client/types.gen.ts:151](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#151)

ChainID is the blockchain chain ID

***

### operator\_address?

> `optional` **operator\_address**: `string`

Defined in: [src/client/types.gen.ts:155](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#155)

OperatorAddress is the operator wallet address

***

### settlement\_recipient?

> `optional` **settlement\_recipient**: `string`

Defined in: [src/client/types.gen.ts:159](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#159)

SettlementRecipient is the address that receives settlement payments
