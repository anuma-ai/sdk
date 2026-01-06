# LlmapiResponseResponse

> **LlmapiResponseResponse** = \{ `created_at?`: `number`; `extra_fields?`: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md); `id?`: `string`; `model?`: `string`; `object?`: `string`; `output?`: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)[]; `usage?`: [`LlmapiResponseUsage`](LlmapiResponseUsage.md); \}

Defined in: [src/client/types.gen.ts:663](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L663)

## Properties

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:667](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L667)

Created is the Unix timestamp of creation (created_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:668](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L668)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:672](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L672)

ID is the unique response identifier

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:676](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L676)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:680](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L680)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)[]

Defined in: [src/client/types.gen.ts:684](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L684)

Output is the array of output items (OpenAI Responses API format)

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:685](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L685)
