# PostApiV1ConnectorsByProviderProxyErrors

> **PostApiV1ConnectorsByProviderProxyErrors** = `object`

Defined in: [src/client/types.gen.ts:8024](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8024)

## Properties

### 400

> **400**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:8028](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8028)

disallowed path / invalid body / missing write body / provider has no proxy

***

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8032](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8032)

Unauthorized

***

### 403

> **403**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:8036](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8036)

insufficient\_scope / connector\_disabled

***

### 412

> **412**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:8040](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8040)

connector\_not\_connected / scope\_not\_covered / invalid\_grant

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:8044](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8044)

Internal Server Error

***

### 503

> **503**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:8048](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#8048)

upstream\_unavailable
