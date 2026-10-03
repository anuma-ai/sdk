# HandlersSendTestPushRequest

> **HandlersSendTestPushRequest** = `object`

Defined in: [src/client/types.gen.ts:3278](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3278)

## Properties

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3279](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3279)

***

### body?

> `optional` **body**: `string`

Defined in: [src/client/types.gen.ts:3280](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3280)

***

### data?

> `optional` **data**: `object`

Defined in: [src/client/types.gen.ts:3281](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3281)

**Index Signature**

\[`key`: `string`]: `unknown`

***

### event\_type?

> `optional` **event\_type**: `string`

Defined in: [src/client/types.gen.ts:3291](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3291)

EventType routes the test push through the full Dispatch pipeline
(kill-switch → category mapping → recipient preference → channelId)
instead of the raw device fan-out — the E2E knob for verifying the
gates themselves. Empty keeps the raw send: an operator debugging
delivery should not be blocked by the target's preferences.

***

### title?

> `optional` **title**: `string`

Defined in: [src/client/types.gen.ts:3292](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3292)

***

### url?

> `optional` **url**: `string`

Defined in: [src/client/types.gen.ts:3293](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3293)

***

### user\_address?

> `optional` **user\_address**: `string`

Defined in: [src/client/types.gen.ts:3294](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3294)
