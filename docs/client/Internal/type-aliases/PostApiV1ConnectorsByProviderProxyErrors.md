# PostApiV1ConnectorsByProviderProxyErrors

> **PostApiV1ConnectorsByProviderProxyErrors** = `object`

Defined in: [src/client/types.gen.ts:6808](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6808)

## Properties

### 400

> **400**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:6812](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6812)

disallowed path / invalid body / missing write body / provider has no proxy

***

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6816](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6816)

Unauthorized

***

### 403

> **403**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:6820](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6820)

insufficient\_scope / connector\_disabled

***

### 412

> **412**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:6824](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6824)

connector\_not\_connected / scope\_not\_covered / invalid\_grant

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6828](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6828)

Internal Server Error

***

### 503

> **503**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:6832](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6832)

upstream\_unavailable
