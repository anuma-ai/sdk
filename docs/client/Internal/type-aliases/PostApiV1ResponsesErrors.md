# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:8381](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8381)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8385](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8385)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:8389](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8389)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8393](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8393)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8397](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8397)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8401](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8401)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8405](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8405)

Internal Server Error
