# HandlersCreditBalanceResponse

> **HandlersCreditBalanceResponse** = `object`

Defined in: [src/client/types.gen.ts:1766](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1766)

## Properties

### available\_credits

> **available\_credits**: `number`

Defined in: [src/client/types.gen.ts:1770](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1770)

Available credits (1 credit = $0.01)

***

### expiring\_credits?

> `optional` **expiring\_credits**: [`HandlersExpiringCredits`](HandlersExpiringCredits.md)\[]

Defined in: [src/client/types.gen.ts:1774](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1774)

Upcoming credit expirations (soonest first)

***

### lifetime\_credits

> **lifetime\_credits**: `number`

Defined in: [src/client/types.gen.ts:1778](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1778)

Total credits ever received (1 credit = $0.01)

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:1782](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1782)

"basic" or "pro"

***

### total\_tokens\_redeemed?

> `optional` **total\_tokens\_redeemed**: `string`

Defined in: [src/client/types.gen.ts:1786](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1786)

Sum of on-chain token amounts redeemed (raw units, format with token decimals)

***

### wallet\_address

> **wallet\_address**: `string`

Defined in: [src/client/types.gen.ts:1787](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1787)
