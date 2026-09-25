# StreamSmoothingConfig

> **StreamSmoothingConfig** = `object`

Defined in: [src/lib/chat/useChat/StreamSmoother.ts:7](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/useChat/StreamSmoother.ts#7)

Configuration for stream output smoothing.

Controls the adaptive speed ramp that meters out streaming text
at a consistent pace regardless of how fast the model produces tokens.

## Properties

### enabled

> **enabled**: `boolean`

Defined in: [src/lib/chat/useChat/StreamSmoother.ts:9](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/useChat/StreamSmoother.ts#9)

Whether smoothing is enabled. Default: true

***

### maxSpeed?

> `optional` **maxSpeed**: `number`

Defined in: [src/lib/chat/useChat/StreamSmoother.ts:13](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/useChat/StreamSmoother.ts#13)

Maximum chars/sec after ramp completes. Default: 600

***

### minSpeed?

> `optional` **minSpeed**: `number`

Defined in: [src/lib/chat/useChat/StreamSmoother.ts:11](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/useChat/StreamSmoother.ts#11)

Minimum chars/sec at the start of streaming. Default: 60

***

### rampDuration?

> `optional` **rampDuration**: `number`

Defined in: [src/lib/chat/useChat/StreamSmoother.ts:15](https://github.com/anuma-ai/sdk/blob/main/src/lib/chat/useChat/StreamSmoother.ts#15)

Duration in ms to ramp from minSpeed to maxSpeed. Default: 4000
