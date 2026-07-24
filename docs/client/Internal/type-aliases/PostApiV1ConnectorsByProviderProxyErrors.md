# PostApiV1ConnectorsByProviderProxyErrors

> **PostApiV1ConnectorsByProviderProxyErrors** = `object`

Defined in: [src/client/types.gen.ts:7132](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7132)

## Properties

### 400

> **400**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7136](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7136)

disallowed path / invalid body / missing write body / provider has no proxy

***

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7140](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7140)

Unauthorized

***

### 403

> **403**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7144](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7144)

insufficient\_scope / connector\_disabled

***

### 412

> **412**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7148](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7148)

connector\_not\_connected / scope\_not\_covered / invalid\_grant

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7152](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7152)

Internal Server Error

***

### 503

> **503**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7156](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7156)

upstream\_unavailable
