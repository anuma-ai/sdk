# PostApiV1ConnectorsByProviderProxyErrors

> **PostApiV1ConnectorsByProviderProxyErrors** = `object`

Defined in: [src/client/types.gen.ts:6837](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6837)

## Properties

### 400

> **400**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:6841](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6841)

disallowed path / invalid body / missing write body / provider has no proxy

***

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6845](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6845)

Unauthorized

***

### 403

> **403**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:6849](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6849)

insufficient\_scope / connector\_disabled

***

### 412

> **412**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:6853](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6853)

connector\_not\_connected / scope\_not\_covered / invalid\_grant

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:6857](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6857)

Internal Server Error

***

### 503

> **503**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:6861](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#6861)

upstream\_unavailable
