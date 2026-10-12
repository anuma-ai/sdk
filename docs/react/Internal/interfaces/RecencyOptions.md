# RecencyOptions

Defined in: [src/lib/memory/recency.ts:6](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recency.ts#6)

## Properties

### floor?

> `optional` **floor**: `number`

Defined in: [src/lib/memory/recency.ts:12](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recency.ts#12)

Lower bound on the multiplier so very old memories don't vanish. Default 0.1.

***

### noDateMultiplier?

> `optional` **noDateMultiplier**: `number`

Defined in: [src/lib/memory/recency.ts:14](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recency.ts#14)

Multiplier returned when `updatedAt` is missing. Default 0.5 (neutral).

***

### now?

> `optional` **now**: `Date`

Defined in: [src/lib/memory/recency.ts:8](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recency.ts#8)

Override "now" — useful for deterministic tests and back-dated benchmarks.

***

### perYearDecay?

> `optional` **perYearDecay**: `number`

Defined in: [src/lib/memory/recency.ts:10](https://github.com/anuma-ai/sdk/blob/main/src/lib/memory/recency.ts#10)

Linear decay slope per year. Default 0.2 (1y → 0.8x, 4.5y → floor).
