# HandlersCreditBalanceResponse

> **HandlersCreditBalanceResponse** = `object`

Defined in: [src/client/types.gen.ts:642](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#642)

## Properties

### available\_credits

> **available\_credits**: `number`

Defined in: [src/client/types.gen.ts:646](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#646)

Available credits (1 credit = $0.01)

***

### expiring\_credits?

> `optional` **expiring\_credits**: [`HandlersExpiringCredits`](HandlersExpiringCredits.md)\[]

Defined in: [src/client/types.gen.ts:650](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#650)

Upcoming credit expirations (soonest first)

***

### lifetime\_credits

> **lifetime\_credits**: `number`

Defined in: [src/client/types.gen.ts:654](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#654)

Total credits ever received (1 credit = $0.01)

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:658](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#658)

"basic" or "pro"

***

### total\_tokens\_redeemed?

> `optional` **total\_tokens\_redeemed**: `string`

Defined in: [src/client/types.gen.ts:662](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#662)

Sum of on-chain token amounts redeemed (raw units, format with token decimals)

***

### wallet\_address

> **wallet\_address**: `string`

Defined in: [src/client/types.gen.ts:663](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#663)
