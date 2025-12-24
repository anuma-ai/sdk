# LlmapiResponseResponse

> **LlmapiResponseResponse** = `object`

Defined in: [src/client/types.gen.ts:651](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L651)

## Properties

### created\_at?

> `optional` **created\_at**: `number`

Defined in: [src/client/types.gen.ts:655](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L655)

Created is the Unix timestamp of creation (created_at in OpenAI format)

***

### extra\_fields?

> `optional` **extra\_fields**: [`LlmapiResponseExtraFields`](LlmapiResponseExtraFields.md)

Defined in: [src/client/types.gen.ts:656](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L656)

***

### id?

> `optional` **id**: `string`

Defined in: [src/client/types.gen.ts:660](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L660)

ID is the unique response identifier

***

### model?

> `optional` **model**: `string`

Defined in: [src/client/types.gen.ts:664](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L664)

Model is the model used for generation

***

### object?

> `optional` **object**: `string`

Defined in: [src/client/types.gen.ts:668](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L668)

Object is the response type (e.g., "response")

***

### output?

> `optional` **output**: [`LlmapiResponseOutputItem`](LlmapiResponseOutputItem.md)[]

Defined in: [src/client/types.gen.ts:672](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L672)

Output is the array of output items (OpenAI Responses API format)

***

### usage?

> `optional` **usage**: [`LlmapiResponseUsage`](LlmapiResponseUsage.md)

Defined in: [src/client/types.gen.ts:673](https://github.com/zeta-chain/ai-sdk/blob/main/src/client/types.gen.ts#L673)
