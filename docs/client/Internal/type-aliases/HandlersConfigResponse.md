# HandlersConfigResponse

> **HandlersConfigResponse** = `object`

Defined in: src/client/types.gen.ts:17

## Properties

### chain\_id?

> `optional` **chain\_id**: `string`

Defined in: src/client/types.gen.ts:21

ChainID is the blockchain chain ID

***

### cost\_limit\_escrow\_address?

> `optional` **cost\_limit\_escrow\_address**: `string`

Defined in: src/client/types.gen.ts:25

CostLimitEscrowAddress is the cost-limit escrow contract address (if configured)

***

### operator\_address?

> `optional` **operator\_address**: `string`

Defined in: src/client/types.gen.ts:29

OperatorAddress is the operator wallet address

***

### pay\_as\_you\_go\_escrow\_address?

> `optional` **pay\_as\_you\_go\_escrow\_address**: `string`

Defined in: src/client/types.gen.ts:33

PayAsYouGoEscrowAddress is the pay-as-you-go escrow contract address (if configured)

***

### payment\_model?

> `optional` **payment\_model**: `string`

Defined in: src/client/types.gen.ts:37

PaymentModel is the payment model used (pay\_as\_you\_go or cost\_limit)

***

### settlement\_recipient?

> `optional` **settlement\_recipient**: `string`

Defined in: src/client/types.gen.ts:41

SettlementRecipient is the address that receives settlement payments
