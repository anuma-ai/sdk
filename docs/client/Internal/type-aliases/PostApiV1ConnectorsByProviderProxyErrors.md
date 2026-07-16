# PostApiV1ConnectorsByProviderProxyErrors

> **PostApiV1ConnectorsByProviderProxyErrors** = `object`

Defined in: [src/client/types.gen.ts:7027](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7027)

## Properties

### 400

> **400**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7031](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7031)

disallowed path / invalid body / missing write body / provider has no proxy

***

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7035](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7035)

Unauthorized

***

### 403

> **403**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7039](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7039)

insufficient\_scope / connector\_disabled

***

### 412

> **412**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7043](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7043)

connector\_not\_connected / scope\_not\_covered / invalid\_grant

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7047](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7047)

Internal Server Error

***

### 503

> **503**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7051](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7051)

upstream\_unavailable
