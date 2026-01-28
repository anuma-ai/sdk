# HandlersConfigResponse

> **HandlersConfigResponse** = `object`

Defined in: [src/client/types.gen.ts:59](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L59)

## Properties

### apps?

> `optional` **apps**: [`HandlersAppConfig`](HandlersAppConfig.md)\[]

Defined in: [src/client/types.gen.ts:63](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L63)

Apps is the list of active apps with their escrow contracts

***

### chain\_id?

> `optional` **chain\_id**: `string`

Defined in: [src/client/types.gen.ts:67](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L67)

ChainID is the blockchain chain ID

***

### operator\_address?

> `optional` **operator\_address**: `string`

Defined in: [src/client/types.gen.ts:71](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L71)

OperatorAddress is the operator wallet address

***

### payment\_model?

> `optional` **payment\_model**: `string`

Defined in: [src/client/types.gen.ts:75](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L75)

PaymentModel is the payment model used (pay\_as\_you\_go or cost\_limit)

***

### settlement\_recipient?

> `optional` **settlement\_recipient**: `string`

Defined in: [src/client/types.gen.ts:79](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L79)

SettlementRecipient is the address that receives settlement payments
