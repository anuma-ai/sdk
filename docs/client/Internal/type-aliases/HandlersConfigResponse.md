# HandlersConfigResponse

> **HandlersConfigResponse** = `object`

Defined in: [src/client/types.gen.ts:102](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L102)

## Properties

### apps?

> `optional` **apps**: [`HandlersAppConfig`](HandlersAppConfig.md)\[]

Defined in: [src/client/types.gen.ts:106](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L106)

Apps is the list of active apps with their escrow contracts

***

### chain\_id?

> `optional` **chain\_id**: `string`

Defined in: [src/client/types.gen.ts:110](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L110)

ChainID is the blockchain chain ID

***

### operator\_address?

> `optional` **operator\_address**: `string`

Defined in: [src/client/types.gen.ts:114](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L114)

OperatorAddress is the operator wallet address

***

### payment\_model?

> `optional` **payment\_model**: `string`

Defined in: [src/client/types.gen.ts:118](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L118)

PaymentModel is the payment model used (pay\_as\_you\_go or cost\_limit)

***

### settlement\_recipient?

> `optional` **settlement\_recipient**: `string`

Defined in: [src/client/types.gen.ts:122](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L122)

SettlementRecipient is the address that receives settlement payments
