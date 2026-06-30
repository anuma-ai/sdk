# ConfigCuratedModel

> **ConfigCuratedModel** = `object`

Defined in: [src/client/types.gen.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#26)

## Properties

### active?

> `optional` **active**: `boolean`

Defined in: [src/client/types.gen.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#27)

***

### best\_for?

> `optional` **best\_for**: `string`\[]

Defined in: [src/client/types.gen.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#35)

BestFor lists the use cases this model is well-suited to, e.g.
"coding", "writing", "reasoning", "vision", "creative". Drives the
task-aware smart groups on the client ("Best for Coding", …). Product-
curated and optional — a model with no entries simply won't be offered by
a task group. Free-form strings; the client matches case-insensitively.

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:39](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#39)

"text" | "image" | "vision"

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:40](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#40)

***

### featured?

> `optional` **featured**: `boolean`

Defined in: [src/client/types.gen.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#41)

***

### group\_display\_name?

> `optional` **group\_display\_name**: `string`

Defined in: [src/client/types.gen.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#42)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#43)

***

### is\_new?

> `optional` **is\_new**: `boolean`

Defined in: [src/client/types.gen.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#50)

IsNew flags a recently-shipped model so clients can render a
"New" badge in the picker. Set true on freshly-launched additions;
product should clear it once the model has been GA for a release
or two so the badge stays meaningful.

***

### is\_private?

> `optional` **is\_private**: `boolean`

Defined in: [src/client/types.gen.ts:51](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#51)

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:63](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#63)

MaxInputTokens is the authoritative input-context window for this model,
in tokens, sourced from the provider's docs / model card. REQUIRED for
every entry (ValidateCuratedModels rejects <= 0). It is the owned (#1)
source for the credit-hold input clamp and the pre-413 over-context gate
— see internal/llmgateway resolveContextWindow. For image models this is
the text-prompt token budget. Keep generous rather than tight: the 413
path is fail-open and a too-low window would false-reject affordable
requests, so when a provider is ambiguous prefer the larger documented
number.

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#64)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#65)

***

### price\_tier?

> `optional` **price\_tier**: `string`

Defined in: [src/client/types.gen.ts:69](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#69)

"$" | "$$" | "$$$"

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:70](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#70)

***

### quality?

> `optional` **quality**: `string`

Defined in: [src/client/types.gen.ts:74](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#74)

"high" | "medium" | "low"

***

### required\_tier?

> `optional` **required\_tier**: `string`

Defined in: [src/client/types.gen.ts:78](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#78)

"" | "Starter" | "Pro"

***

### retired?

> `optional` **retired**: `boolean`

Defined in: [src/client/types.gen.ts:87](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#87)

Retired marks a model whose upstream route is dead (the provider dropped
the slug) — distinct from Active:false, which only hides a model from the
picker. resolveAutoModel reroutes an explicitly-requested Retired model to
the tier default so stale client selections don't 404 (#1188). A model can
be Active:false yet still serve fine for users who explicitly picked it
(e.g. a demoted-but-live former default) — do NOT mark those Retired.

***

### speed\_tier?

> `optional` **speed\_tier**: `string`

Defined in: [src/client/types.gen.ts:94](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#94)

SpeedTier is a coarse latency class — "fast" | "balanced" | "slow" —
independent of Quality (a high-quality model can still be fast). Lets the
"Speed Round" group select on real speed rather than inferring it from
price/quality. Optional; empty means "unspecified".
