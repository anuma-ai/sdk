# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:624](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L624)

## Properties

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:628](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L628)

Created is the Unix timestamp of creation (created_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:629](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L629)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:633](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L633)

ID is the unique response identifier

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:637](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L637)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:641](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L641)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)[]

Defined in: [src/client/types.gen.ts:645](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L645)

Output is the array of output items (OpenAI Responses API format)

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:646](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L646)
