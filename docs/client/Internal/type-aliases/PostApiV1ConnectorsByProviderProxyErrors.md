# PostApiV1ConnectorsByProviderProxyErrors

> **PostApiV1ConnectorsByProviderProxyErrors** = `object`

Defined in: [src/client/types.gen.ts:7086](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7086)

## Properties

### 400

> **400**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7090](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7090)

disallowed path / invalid body / missing write body / provider has no proxy

***

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7094](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7094)

Unauthorized

***

### 403

> **403**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7098](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7098)

insufficient\_scope / connector\_disabled

***

### 412

> **412**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7102](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7102)

connector\_not\_connected / scope\_not\_covered / invalid\_grant

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7106](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7106)

Internal Server Error

***

### 503

> **503**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7110](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7110)

upstream\_unavailable
