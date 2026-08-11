# HandlersSendTestPushRequest

> **HandlersSendTestPushRequest** = `object`

Defined in: [src/client/types.gen.ts:2888](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2888)

## Properties

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:2889](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2889)

***

### body?

> `optional` **body**: `string`

Defined in: [src/client/types.gen.ts:2890](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2890)

***

### data?

> `optional` **data**: `object`

Defined in: [src/client/types.gen.ts:2891](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2891)

**Index Signature**

\[`key`: `string`]: `unknown`

***

### event\_type?

> `optional` **event\_type**: `string`

Defined in: [src/client/types.gen.ts:2901](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2901)

EventType routes the test push through the full Dispatch pipeline
(kill-switch → category mapping → recipient preference → channelId)
instead of the raw device fan-out — the E2E knob for verifying the
gates themselves. Empty keeps the raw send: an operator debugging
delivery should not be blocked by the target's preferences.

***

### title?

> `optional` **title**: `string`

Defined in: [src/client/types.gen.ts:2902](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2902)

***

### url?

> `optional` **url**: `string`

Defined in: [src/client/types.gen.ts:2903](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2903)

***

### user\_address?

> `optional` **user\_address**: `string`

Defined in: [src/client/types.gen.ts:2904](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2904)
