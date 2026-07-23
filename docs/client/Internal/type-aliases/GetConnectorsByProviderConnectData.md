# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:10482](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10482)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10483](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10483)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10484](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10484)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10490](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10490)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:10496](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10496)
