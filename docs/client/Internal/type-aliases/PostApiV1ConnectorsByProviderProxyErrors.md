# PostApiV1ConnectorsByProviderProxyErrors

> **PostApiV1ConnectorsByProviderProxyErrors** = `object`

Defined in: [src/client/types.gen.ts:7096](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7096)

## Properties

### 400

> **400**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7100](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7100)

disallowed path / invalid body / missing write body / provider has no proxy

***

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7104](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7104)

Unauthorized

***

### 403

> **403**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7108](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7108)

insufficient\_scope / connector\_disabled

***

### 412

> **412**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7112](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7112)

connector\_not\_connected / scope\_not\_covered / invalid\_grant

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7116](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7116)

Internal Server Error

***

### 503

> **503**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7120](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7120)

upstream\_unavailable
