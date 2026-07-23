# PostApiV1UtilityResponsesErrors

> **PostApiV1UtilityResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:10104](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10104)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10108](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10108)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:10112](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10112)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10116](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10116)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10120)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10124](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10124)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10128](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10128)

Internal Server Error
