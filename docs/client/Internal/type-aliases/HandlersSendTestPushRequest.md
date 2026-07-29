# HandlersSendTestPushRequest

> **HandlersSendTestPushRequest** = `object`

Defined in: [src/client/types.gen.ts:2569](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2569)

## Properties

### account\_id?

> `optional` **account\_id**: `number`

Defined in: [src/client/types.gen.ts:2570](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2570)

***

### body?

> `optional` **body**: `string`

Defined in: [src/client/types.gen.ts:2571](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2571)

***

### data?

> `optional` **data**: `object`

Defined in: [src/client/types.gen.ts:2572](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2572)

**Index Signature**

\[`key`: `string`]: `unknown`

***

### event\_type?

> `optional` **event\_type**: `string`

Defined in: [src/client/types.gen.ts:2582](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2582)

EventType routes the test push through the full Dispatch pipeline
(kill-switch → category mapping → recipient preference → channelId)
instead of the raw device fan-out — the E2E knob for verifying the
gates themselves. Empty keeps the raw send: an operator debugging
delivery should not be blocked by the target's preferences.

***

### title?

> `optional` **title**: `string`

Defined in: [src/client/types.gen.ts:2583](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2583)

***

### url?

> `optional` **url**: `string`

Defined in: [src/client/types.gen.ts:2584](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2584)

***

### user\_address?

> `optional` **user\_address**: `string`

Defined in: [src/client/types.gen.ts:2585](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#2585)
