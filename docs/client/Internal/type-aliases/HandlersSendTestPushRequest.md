# HandlersSendTestPushRequest

> **HandlersSendTestPushRequest** = `object`

Defined in: [src/client/types.gen.ts:3003](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3003)

## Properties

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3004](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3004)

***

### body?

> `optional` **body**: `string`

Defined in: [src/client/types.gen.ts:3005](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3005)

***

### data?

> `optional` **data**: `object`

Defined in: [src/client/types.gen.ts:3006](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3006)

**Index Signature**

\[`key`: `string`]: `unknown`

***

### event\_type?

> `optional` **event\_type**: `string`

Defined in: [src/client/types.gen.ts:3016](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3016)

EventType routes the test push through the full Dispatch pipeline
(kill-switch → category mapping → recipient preference → channelId)
instead of the raw device fan-out — the E2E knob for verifying the
gates themselves. Empty keeps the raw send: an operator debugging
delivery should not be blocked by the target's preferences.

***

### title?

> `optional` **title**: `string`

Defined in: [src/client/types.gen.ts:3017](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3017)

***

### url?

> `optional` **url**: `string`

Defined in: [src/client/types.gen.ts:3018](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3018)

***

### user\_address?

> `optional` **user\_address**: `string`

Defined in: [src/client/types.gen.ts:3019](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3019)
