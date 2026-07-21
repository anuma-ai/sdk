# GetConnectorsByProviderConnectData

> **GetConnectorsByProviderConnectData** = `object`

Defined in: [src/client/types.gen.ts:10418](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10418)

## Properties

### body?

> `optional` **body**: `never`

Defined in: [src/client/types.gen.ts:10419](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10419)

***

### path

> **path**: `object`

Defined in: [src/client/types.gen.ts:10420](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10420)

**provider**

> **provider**: `string`

Logical connector provider (gmail, gdrive, gcalendar, github, notion, dropbox)

***

### query

> **query**: `object`

Defined in: [src/client/types.gen.ts:10426](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10426)

**ticket**

> **ticket**: `string`

Ticket ID from POST /api/v1/connect-tickets

***

### url

> **url**: `"/connectors/{provider}/connect"`

Defined in: [src/client/types.gen.ts:10432](https://github.com/anuma-ai/sdk/blob/main/src/client/types.gen.ts#10432)
