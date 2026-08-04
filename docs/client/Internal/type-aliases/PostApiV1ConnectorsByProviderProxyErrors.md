# PostApiV1ConnectorsByProviderProxyErrors

> **PostApiV1ConnectorsByProviderProxyErrors** = `object`

Defined in: [src/client/types.gen.ts:7622](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7622)

## Properties

### 400

> **400**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7626](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7626)

disallowed path / invalid body / missing write body / provider has no proxy

***

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7630](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7630)

Unauthorized

***

### 403

> **403**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7634](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7634)

insufficient\_scope / connector\_disabled

***

### 412

> **412**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7638](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7638)

connector\_not\_connected / scope\_not\_covered / invalid\_grant

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7642](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7642)

Internal Server Error

***

### 503

> **503**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7646](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7646)

upstream\_unavailable
