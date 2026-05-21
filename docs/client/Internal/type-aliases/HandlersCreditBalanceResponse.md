# HandlersCreditBalanceResponse

> **HandlersCreditBalanceResponse** = `object`

Defined in: [src/client/types.gen.ts:513](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#513)

## Properties

### available\_credits

> **available\_credits**: `number`

Defined in: [src/client/types.gen.ts:517](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#517)

Available credits (1 credit = $0.01)

***

### can\_claim\_daily

> **can\_claim\_daily**: `boolean`

Defined in: [src/client/types.gen.ts:518](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#518)

***

### claimed\_import\_rewards

> **claimed\_import\_rewards**: `string`\[]

Defined in: [src/client/types.gen.ts:522](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#522)

Which import providers have been claimed

***

### expiring\_credits?

> `optional` **expiring\_credits**: [`HandlersExpiringCredits`](HandlersExpiringCredits.md)\[]

Defined in: [src/client/types.gen.ts:526](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#526)

Upcoming credit expirations (soonest first)

***

### last\_claim\_at?

> `optional` **last\_claim\_at**: `string`

Defined in: [src/client/types.gen.ts:527](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#527)

***

### lifetime\_credits

> **lifetime\_credits**: `number`

Defined in: [src/client/types.gen.ts:531](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#531)

Total credits ever received (1 credit = $0.01)

***

### next\_claim\_at?

> `optional` **next\_claim\_at**: `string`

Defined in: [src/client/types.gen.ts:532](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#532)

***

### subscription\_tier

> **subscription\_tier**: `string`

Defined in: [src/client/types.gen.ts:536](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#536)

"basic" or "pro"

***

### wallet\_address

> **wallet\_address**: `string`

Defined in: [src/client/types.gen.ts:537](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#537)
