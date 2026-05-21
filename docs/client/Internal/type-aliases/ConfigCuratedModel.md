# ConfigCuratedModel

> **ConfigCuratedModel** = `object`

Defined in: [src/client/types.gen.ts:26](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#26)

## Properties

### active?

> `optional` **active**: `boolean`

Defined in: [src/client/types.gen.ts:27](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#27)

***

### category?

> `optional` **category**: `string`

Defined in: [src/client/types.gen.ts:31](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#31)

"text" | "image" | "vision"

***

### description?

> `optional` **description**: `string`

Defined in: [src/client/types.gen.ts:32](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#32)

***

### featured?

> `optional` **featured**: `boolean`

Defined in: [src/client/types.gen.ts:33](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#33)

***

### group\_display\_name?

> `optional` **group\_display\_name**: `string`

Defined in: [src/client/types.gen.ts:34](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#34)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:35](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#35)

***

### is\_new?

> `optional` **is\_new**: `boolean`

Defined in: [src/client/types.gen.ts:42](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#42)

IsNew flags a recently-shipped model so clients can render a
"New" badge in the picker. Set true on freshly-launched additions;
product should clear it once the model has been GA for a release
or two so the badge stays meaningful.

***

### is\_private?

> `optional` **is\_private**: `boolean`

Defined in: [src/client/types.gen.ts:43](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#43)

***

### modalities?

> `optional` **modalities**: `string`\[]

Defined in: [src/client/types.gen.ts:44](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#44)

***

### name?

> `optional` **name**: `string`

Defined in: [src/client/types.gen.ts:45](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#45)

***

### price\_tier?

> `optional` **price\_tier**: `string`

Defined in: [src/client/types.gen.ts:49](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#49)

"$" | "$$" | "$$$"

***

### provider?

> `optional` **provider**: `string`

Defined in: [src/client/types.gen.ts:50](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#50)

***

### quality?

> `optional` **quality**: `string`

Defined in: [src/client/types.gen.ts:54](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#54)

"high" | "medium" | "low"

***

### required\_tier?

> `optional` **required\_tier**: `string`

Defined in: [src/client/types.gen.ts:58](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#58)

"" | "Starter" | "Pro"
