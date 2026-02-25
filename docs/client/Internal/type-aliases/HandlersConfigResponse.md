# HandlersConfigResponse

> **HandlersConfigResponse** = `object`

Defined in: [src/client/types.gen.ts:124](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#124)

## Properties

### apps?

> `optional` **apps**: [`HandlersAppConfig`](HandlersAppConfig.md)\[]

Defined in: [src/client/types.gen.ts:128](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#128)

Apps is the list of active apps with their escrow contracts

***

### chain\_id?

> `optional` **chain\_id**: `string`

Defined in: [src/client/types.gen.ts:132](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#132)

ChainID is the blockchain chain ID

***

### operator\_address?

> `optional` **operator\_address**: `string`

Defined in: [src/client/types.gen.ts:136](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#136)

OperatorAddress is the operator wallet address

***

### settlement\_recipient?

> `optional` **settlement\_recipient**: `string`

Defined in: [src/client/types.gen.ts:140](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#140)

SettlementRecipient is the address that receives settlement payments
