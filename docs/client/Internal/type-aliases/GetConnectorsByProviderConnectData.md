# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:9230](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9230)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9231](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9231)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9232](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9232)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9238](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9238)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:9244](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9244)
