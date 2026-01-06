# HandlersConfigResponse

> **HandlersConfigResponse** = \{ `chain_id?`: `string`; `cost_limit_escrow_address?`: `string`; `operator_address?`: `string`; `pay_as_you_go_escrow_address?`: `string`; `payment_model?`: `string`; `settlement_recipient?`: `string`; \}

Defined in: [src/client/types.gen.ts:7](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L7)

## Properties

### chain\_id?

> `optional` **chain\_id**: `string`

Defined in: [src/client/types.gen.ts:11](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L11)

ChainID is the blockchain chain ID

***

### cost\_limit\_escrow\_address?

> `optional` **cost\_limit\_escrow\_address**: `string`

Defined in: [src/client/types.gen.ts:15](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L15)

CostLimitEscrowAddress is the cost-limit escrow contract address (if configured)

***

### operator\_address?

> `optional` **operator\_address**: `string`

Defined in: [src/client/types.gen.ts:19](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L19)

OperatorAddress is the operator wallet address

***

### pay\_as\_you\_go\_escrow\_address?

> `optional` **pay\_as\_you\_go\_escrow\_address**: `string`

Defined in: [src/client/types.gen.ts:23](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L23)

PayAsYouGoEscrowAddress is the pay-as-you-go escrow contract address (if configured)

***

### payment\_model?

> `optional` **payment\_model**: `string`

Defined in: [src/client/types.gen.ts:27](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L27)

PaymentModel is the payment model used (pay_as_you_go or cost_limit)

***

### settlement\_recipient?

> `optional` **settlement\_recipient**: `string`

Defined in: [src/client/types.gen.ts:31](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L31)

SettlementRecipient is the address that receives settlement payments
