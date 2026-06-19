# HandlersCreditBalanceResponse

> **HandlersCreditBalanceResponse** = `object`

Defined in: [src/client/types.gen.ts:1790](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1790)

## Properties

### available\_credits

> **available\_credits**: `number`

Defined in: [src/client/types.gen.ts:1794](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1794)

Available credits (1 credit = $0.01)

***

### expiring\_credits?

> `optional` **expiring\_credits**: [`HandlersExpiringCredits`](HandlersExpiringCredits.md)\[]

Defined in: [src/client/types.gen.ts:1798](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1798)

Upcoming credit expirations (soonest first)

***

### lifetime\_credits

> **lifetime\_credits**: `number`

Defined in: [src/client/types.gen.ts:1802](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1802)

Total credits ever received (1 credit = $0.01)

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:1806](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1806)

"basic" or "pro"

***

### total\_tokens\_redeemed?

> `optional` **total\_tokens\_redeemed**: `string`

Defined in: [src/client/types.gen.ts:1810](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1810)

Sum of on-chain token amounts redeemed (raw units, format with token decimals)

***

### wallet\_address

> **wallet\_address**: `string`

Defined in: [src/client/types.gen.ts:1811](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#1811)
