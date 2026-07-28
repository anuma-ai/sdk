# PostApiV1ConnectorsByProviderProxyErrors

> **PostApiV1ConnectorsByProviderProxyErrors** = `object`

Defined in: [src/client/types.gen.ts:7138](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7138)

## Properties

### 400

> **400**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7142](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7142)

disallowed path / invalid body / missing write body / provider has no proxy

***

### 401

> **401**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7146](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7146)

Unauthorized

***

### 403

> **403**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7150](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7150)

insufficient\_scope / connector\_disabled

***

### 412

> **412**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7154](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7154)

connector\_not\_connected / scope\_not\_covered / invalid\_grant

***

### 500

> **500**: [`ResponseErrorResponse`](ResponseErrorResponse.md)

Defined in: [src/client/types.gen.ts:7158](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7158)

Internal Server Error

***

### 503

> **503**: [`HandlersConnectorMintErrorResponse`](HandlersConnectorMintErrorResponse.md)

Defined in: [src/client/types.gen.ts:7162](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#7162)

upstream\_unavailable
