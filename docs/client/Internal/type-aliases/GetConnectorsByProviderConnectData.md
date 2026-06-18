# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:9598](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9598)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:9599](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9599)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:9600](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9600)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:9606](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9606)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:9612](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#9612)
