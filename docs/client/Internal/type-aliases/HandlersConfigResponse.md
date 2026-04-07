# HandlersConfigResponse

> **HandlersConfigResponse** = `object`

Defined in: [src/client/types.gen.ts:340](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#340)

## Properties

### apps?

> `optional` **apps**: [`HandlersAppConfig`](HandlersAppConfig.md)\[]

Defined in: [src/client/types.gen.ts:344](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#344)

Apps is the list of active apps with their escrow contracts

***

### chain\_id?

> `optional` **chain\_id**: `string`

Defined in: [src/client/types.gen.ts:348](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#348)

ChainID is the blockchain chain ID

***

### operator\_address?

> `optional` **operator\_address**: `string`

Defined in: [src/client/types.gen.ts:352](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#352)

OperatorAddress is the operator wallet address

***

### phone\_calls\_enabled?

> `optional` **phone\_calls\_enabled**: `boolean`

Defined in: [src/client/types.gen.ts:356](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#356)

PhoneCallsEnabled indicates whether Bland phone calling is available

***

### settlement\_recipient?

> `optional` **settlement\_recipient**: `string`

Defined in: [src/client/types.gen.ts:360](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#360)

SettlementRecipient is the address that receives settlement payments
