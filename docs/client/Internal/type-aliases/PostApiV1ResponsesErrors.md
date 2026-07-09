# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:8713](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8713)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8717](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8717)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:8721](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8721)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8725](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8725)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8729](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8729)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8733](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8733)

Model provider rate limit exceeded

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8737](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8737)

Internal Server Error
