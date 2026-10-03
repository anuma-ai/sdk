# PostApiV1ResponsesErrors

> **PostApiV1ResponsesErrors** = `object`

Defined in: [src/client/types.gen.ts:10705](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10705)

## Properties

### 400

> **400**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10709](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10709)

Bad Request

***

### 402

> **402**: [`ResponseInsufficientBalanceResponse`](ResponseInsufficientBalanceResponse.md)

Defined in: [src/client/types.gen.ts:10713](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10713)

Insufficient balance or spending cap exceeded

***

### 403

> **403**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10717](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10717)

Model not available on current subscription tier

***

### 413

> **413**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10721](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10721)

Input exceeds model context window

***

### 429

> **429**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10725](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10725)

Model provider rate limit exceeded

***

### 499

> **499**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10729](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10729)

Client closed the request before a response was produced

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:10733](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10733)

Internal Server Error
