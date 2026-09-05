# PostApiV1UtilityResponsesErrors

> **PostApiV1UtilityResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:11864](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11864)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11868](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11868)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:11872](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11872)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11876](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11876)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11880](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11880)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11884](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11884)

Model provider rate limit exceeded

***

### 499

> **499**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11888](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11888)

Client closed the request before a response was produced

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:11892](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#11892)

Internal Server Error
