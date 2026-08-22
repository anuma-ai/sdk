# HandlersSendTestPushRequest

> **HandlersSendTestPushRequest** = `object`

Defined in: [src/client/types.gen.ts:3077](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3077)

## Properties

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:3078](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3078)

***

### body?

> `optional` **body**: `string`

Defined in: [src/client/types.gen.ts:3079](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3079)

***

### data?

> `optional` **data**: `object`

Defined in: [src/client/types.gen.ts:3080](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3080)

**Index Signature**

\[`key`: `string`]: `unknown`

***

### event\_type?

> `optional` **event\_type**: `string`

Defined in: [src/client/types.gen.ts:3090](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3090)

EventType routes the test push through the full Dispatch pipeline
(kill-switch → category mapping → recipient preference → channelId)
instead of the raw device fan-out — the E2E knob for verifying the
gates themselves. Empty keeps the raw send: an operator debugging
delivery should not be blocked by the target's preferences.

***

### title?

> `optional` **title**: `string`

Defined in: [src/client/types.gen.ts:3091](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3091)

***

### url?

> `optional` **url**: `string`

Defined in: [src/client/types.gen.ts:3092](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3092)

***

### user\_address?

> `optional` **user\_address**: `string`

Defined in: [src/client/types.gen.ts:3093](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#3093)
