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

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#54)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:55](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#55)

***

### price\_tier?

> `optional` **price\_tier**: `string`

Defined in: [src/client/types.gen.ts:59](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#59)

"$" | "$$" | "$$$"

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:60](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#60)

***

### quality?

> `optional` **quality**: `string`

Defined in: [src/client/types.gen.ts:64](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#64)

"high" | "medium" | "low"

***

### required\_tier?

> `optional` **required\_tier**: `string`

Defined in: [src/client/types.gen.ts:68](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#68)

"" | "Starter" | "Pro"
