# ConfigCuratedModel

> **ConfigCuratedModel** = `object`

Defined in: [src/client/types.gen.ts:36](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#36)

## Properties

### active?

> `optional` **active**: `boolean`

Defined in: [src/client/types.gen.ts:37](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#37)

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:41](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#41)

"text" | "image" | "vision"

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#42)

***

### featured?

> `optional` **featured**: `boolean`

Defined in: [src/client/types.gen.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#43)

***

### group\_display\_name?

> `optional` **group\_display\_name**: `string`

Defined in: [src/client/types.gen.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#44)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#45)

***

### is\_new?

> `optional` **is\_new**: `boolean`

Defined in: [src/client/types.gen.ts:52](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#52)

IsNew flags a recently-shipped model so clients can render a
"New" badge in the picker. Set true on freshly-launched additions;
product should clear it once the model has been GA for a release
or two so the badge stays meaningful.

***

### is\_private?

> `optional` **is\_private**: `boolean`

Defined in: [src/client/types.gen.ts:53](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#53)

***

### max\_input\_tokens?

> `optional` **max\_input\_tokens**: `number`

Defined in: [src/client/types.gen.ts:65](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#65)

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

Defined in: [src/client/types.gen.ts:66](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#66)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:67](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#67)

***

### price\_tier?

> `optional` **price\_tier**: `string`

Defined in: [src/client/types.gen.ts:71](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#71)

"$" | "$$" | "$$$"

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:72](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#72)

***

### quality?

> `optional` **quality**: `string`

Defined in: [src/client/types.gen.ts:76](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#76)

"high" | "medium" | "low"

***

### required\_tier?

> `optional` **required\_tier**: `string`

Defined in: [src/client/types.gen.ts:80](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#80)

"" | "Starter" | "Pro"

***

### retired?

> `optional` **retired**: `boolean`

Defined in: [src/client/types.gen.ts:89](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#89)

Retired marks a model whose upstream route is dead (the provider dropped
the slug) — distinct from Active:false, which only hides a model from the
picker. resolveAutoModel reroutes an explicitly-requested Retired model to
the tier default so stale client selections don't 404 (#1188). A model can
be Active:false yet still serve fine for users who explicitly picked it
(e.g. a demoted-but-live former default) — do NOT mark those Retired.
