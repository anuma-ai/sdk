# PostApiV1ConnectorsByProviderProxyErrors

> **PostApiV1ConnectorsByProviderProxyErrors** = `object`

Defined in: [src/client/types.gen.ts:7091](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7091)

## Properties

### 400

> **400**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7095](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7095)

disallowed path / invalid body / missing write body / provider has no proxy

***

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7099](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7099)

Unauthorized

***

### 403

> **403**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7103](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7103)

insufficient\_scope / connector\_disabled

***

### 412

> **412**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7107](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7107)

connector\_not\_connected / scope\_not\_covered / invalid\_grant

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7111](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7111)

Internal Server Error

***

### 503

> **503**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7115](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7115)

upstream\_unavailable
