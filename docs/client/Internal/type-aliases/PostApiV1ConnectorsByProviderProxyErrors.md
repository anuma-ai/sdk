# PostApiV1ConnectorsByProviderProxyErrors

> **PostApiV1ConnectorsByProviderProxyErrors** = `object`

Defined in: [src/client/types.gen.ts:7172](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7172)

## Properties

### 400

> **400**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7176](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7176)

disallowed path / invalid body / missing write body / provider has no proxy

***

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7180](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7180)

Unauthorized

***

### 403

> **403**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7184](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7184)

insufficient\_scope / connector\_disabled

***

### 412

> **412**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7188](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7188)

connector\_not\_connected / scope\_not\_covered / invalid\_grant

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7192](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7192)

Internal Server Error

***

### 503

> **503**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7196](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7196)

upstream\_unavailable
