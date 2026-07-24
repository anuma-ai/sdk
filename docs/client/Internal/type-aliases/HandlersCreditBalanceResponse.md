# HandlersCreditBalanceResponse

> **HandlersCreditBalanceResponse** = `object`

Defined in: [src/client/types.gen.ts:1856](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1856)

## Properties

### available\_credits

> **available\_credits**: `number`

Defined in: [src/client/types.gen.ts:1860](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1860)

Available credits (1 credit = $0.01)

***

### expiring\_credits?

> `optional` **expiring\_credits**: [`HandlersExpiringCredits`](HandlersExpiringCredits.md)\[]

Defined in: [src/client/types.gen.ts:1864](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1864)

Upcoming credit expirations (soonest first)

***

### lifetime\_credits

> **lifetime\_credits**: `number`

Defined in: [src/client/types.gen.ts:1868](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1868)

Total credits ever received (1 credit = $0.01)

***

### next\_reset\_date?

> `optional` **next\_reset\_date**: `string`

Defined in: [src/client/types.gen.ts:1874](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1874)

NextResetDate is the next monthly credit refill date (ISO8601), keyed on the
credit\_expiry\_day anchor — the same anchor the monthly claim uses, NOT the grant
expires\_at (which is anchor+1). Display-only; does not affect reset logic.

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:1878](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1878)

"basic" or "pro"

***

### total\_tokens\_redeemed?

> `optional` **total\_tokens\_redeemed**: `string`

Defined in: [src/client/types.gen.ts:1882](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1882)

Sum of on-chain token amounts redeemed (raw units, format with token decimals)

***

### wallet\_address

> **wallet\_address**: `string`

Defined in: [src/client/types.gen.ts:1883](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1883)
