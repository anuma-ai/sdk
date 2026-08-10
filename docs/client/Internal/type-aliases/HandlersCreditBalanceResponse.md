# HandlersCreditBalanceResponse

> **HandlersCreditBalanceResponse** = `object`

Defined in: [src/client/types.gen.ts:1944](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1944)

## Properties

### available\_credits

> **available\_credits**: `number`

Defined in: [src/client/types.gen.ts:1948](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1948)

Available credits (1 credit = $0.01)

***

### expiring\_credits?

> `optional` **expiring\_credits**: [`HandlersExpiringCredits`](HandlersExpiringCredits.md)\[]

Defined in: [src/client/types.gen.ts:1952](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1952)

Upcoming credit expirations (soonest first)

***

### lifetime\_credits

> **lifetime\_credits**: `number`

Defined in: [src/client/types.gen.ts:1956](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1956)

Total credits ever received (1 credit = $0.01)

***

### next\_reset\_date?

> `optional` **next\_reset\_date**: `string`

Defined in: [src/client/types.gen.ts:1962](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1962)

NextResetDate is the next monthly credit refill date (ISO8601), keyed on the
credit\_expiry\_day anchor — the same anchor the monthly claim uses, NOT the grant
expires\_at (which is anchor+1). Display-only; does not affect reset logic.

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:1966](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1966)

"basic" or "pro"

***

### total\_tokens\_redeemed?

> `optional` **total\_tokens\_redeemed**: `string`

Defined in: [src/client/types.gen.ts:1970](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1970)

Sum of on-chain token amounts redeemed (raw units, format with token decimals)

***

### wallet\_address

> **wallet\_address**: `string`

Defined in: [src/client/types.gen.ts:1971](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1971)
