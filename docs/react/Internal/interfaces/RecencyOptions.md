# RecencyOptions

Defined in: [src/lib/memory/recency.ts:17](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recency.ts#17)

## Properties

### floor?

> `optional` **floor**: `number`

Defined in: [src/lib/memory/recency.ts:23](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recency.ts#23)

Lower bound on the multiplier so very old memories don't vanish. Default 0.1.

***

### noDateMultiplier?

> `optional` **noDateMultiplier**: `number`

Defined in: [src/lib/memory/recency.ts:25](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recency.ts#25)

Multiplier returned when `updatedAt` is missing. Default 0.5 (neutral).

***

### now?

> `optional` **now**: `Date`

Defined in: [src/lib/memory/recency.ts:19](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recency.ts#19)

Override "now" — useful for deterministic tests and back-dated benchmarks.

***

### perYearDecay?

> `optional` **perYearDecay**: `number`

Defined in: [src/lib/memory/recency.ts:21](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recency.ts#21)

Linear decay slope per year. Default 0.2 (1y → 0.8x, 4.5y → floor).
